/**
 * WebSocket client.
 *
 * Reconnects with backoff, sends the JWT in the first message, and on every
 * reconnect asks the server to replay what was missed. The browser WebSocket API
 * is used directly, as the product spec requires.
 */

import { WS_URL, tokens } from "../api/client";
import type { WsMessage } from "../api/types";

export type WsStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface WsClientOptions {
  onEvent: (message: WsMessage) => void;
  onStatus?: (status: WsStatus) => void;
  /** Called once the server confirms the channel, so the client can refetch. */
  onReady?: () => void;
}

const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 20_000;

export class WsClient {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private stopped = false;
  private lastEventAt: string | null = null;
  private readonly options: WsClientOptions;

  constructor(options: WsClientOptions) {
    this.options = options;
  }

  connect(): void {
    this.stopped = false;
    this.open();
  }

  private setStatus(status: WsStatus) {
    this.options.onStatus?.(status);
  }

  private open(): void {
    const token = tokens.access();
    if (!token) {
      this.setStatus("closed");
      return;
    }

    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting");

    const url = new URL(WS_URL);
    if (this.lastEventAt) url.searchParams.set("since", this.lastEventAt);

    const socket = new WebSocket(url.toString());
    this.socket = socket;

    socket.onopen = () => {
      // The JWT travels in the first message, never as a query parameter on ws://.
      socket.send(JSON.stringify({ token, since: this.lastEventAt }));
      this.attempt = 0;
      this.setStatus("open");
      this.startHeartbeat();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      let message: WsMessage;
      try {
        message = JSON.parse(event.data) as WsMessage;
      } catch {
        return;
      }

      if (message.type === "ping") {
        socket.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (message.type === "connection.ready") {
        this.options.onReady?.();
        return;
      }
      if (message.type === "catchup.completed" || message.type === "pong") return;

      if (message.timestamp) this.lastEventAt = message.timestamp;
      this.options.onEvent(message);
    };

    socket.onclose = (event: CloseEvent) => {
      this.stopHeartbeat();
      this.socket = null;
      if (this.stopped) {
        this.setStatus("closed");
        return;
      }
      // 1008 is a policy violation, which here means the token was rejected.
      // Retrying cannot succeed until the person signs in again.
      if (event.code === 1008) {
        this.stopped = true;
        this.setStatus("closed");
        return;
      }
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.attempt += 1;
    // Exponential backoff with jitter, capped so a long outage still retries.
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(this.attempt, 5));
    const delay = base / 2 + Math.random() * (base / 2);
    this.setStatus("reconnecting");
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  close(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.setStatus("closed");
  }
}
