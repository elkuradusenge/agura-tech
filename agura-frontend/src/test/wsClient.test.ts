import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket | null = null;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeSocket.last = this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.onclose?.({ code: 1000 });
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}

describe("WsClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeSocket);
    localStorage.setItem("agura.access", "token-123");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends the token in the first message, never in the url", async () => {
    const { WsClient } = await import("../lib/ws/client");
    const client = new WsClient({ onEvent: () => undefined });
    client.connect();

    const socket = FakeSocket.last as FakeSocket;
    expect(socket.url).not.toContain("token-123");

    socket.open();
    expect(JSON.parse(socket.sent[0])).toMatchObject({ token: "token-123" });
    client.close();
  });

  it("stops retrying after the server rejects the token with 1008", async () => {
    const { WsClient } = await import("../lib/ws/client");
    const statuses: string[] = [];
    const client = new WsClient({ onEvent: () => undefined, onStatus: (status) => statuses.push(status) });
    client.connect();

    const first = FakeSocket.last as FakeSocket;
    first.onclose?.({ code: 1008 });

    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.last).toBe(first);
    expect(statuses.at(-1)).toBe("closed");
    client.close();
  });

  it("resubscribes with a since cursor after a dropped connection", async () => {
    const { WsClient } = await import("../lib/ws/client");
    const client = new WsClient({ onEvent: () => undefined });
    client.connect();

    const first = FakeSocket.last as FakeSocket;
    first.open();
    first.onmessage?.({ data: JSON.stringify({ type: "task.due", id: "1", timestamp: "2026-01-01T00:00:00Z", payload: {} }) });
    first.onclose?.({ code: 1006 });

    vi.advanceTimersByTime(5_000);
    const second = FakeSocket.last as FakeSocket;
    expect(second).not.toBe(first);
    expect(second.url).toContain("since=");
    client.close();
  });
});
