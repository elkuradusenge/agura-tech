/**
 * Application providers: i18n, theme, low data mode, connectivity and the socket.
 *
 * The socket lives at the root so a screen never opens its own connection. Events
 * are delivered to subscribers and also invalidate the relevant queries.
 */

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "../lib/i18n";
import { WsClient, type WsStatus } from "../lib/ws/client";
import type { WsMessage } from "../lib/api/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type Theme = "light" | "dark";

interface PreferencesValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  lowData: boolean;
  setLowData: (value: boolean) => void;
  online: boolean;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

function readTheme(): Theme {
  const stored = localStorage.getItem("agura.theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readLowData(): boolean {
  return localStorage.getItem("agura.lowData") === "true";
}

function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [lowData, setLowDataState] = useState<boolean>(readLowData);
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("agura.theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.lowData = String(lowData);
    localStorage.setItem("agura.lowData", String(lowData));
  }, [lowData]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
      lowData,
      setLowData: setLowDataState,
      online,
    }),
    [theme, lowData, online],
  );

  return createContextProvider(PreferencesContext, value, children);
}

function createContextProvider<T>(context: React.Context<T | null>, value: T, children: ReactNode) {
  const Provider = context.Provider;
  return <Provider value={value}>{children}</Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (value === null) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}

type EventHandler = (message: WsMessage) => void;

interface SocketValue {
  status: WsStatus;
  subscribe: (handler: EventHandler) => () => void;
}

const SocketContext = createContext<SocketValue | null>(null);

/** Which query keys an event should refresh. */
const INVALIDATION: Record<string, string[]> = {
  "notification.created": ["notifications", "tasks"],
  "task.due": ["tasks", "plantings"],
  "product.published": ["products", "plantings"],
  "product.updated": ["products", "plantings"],
  "analysis.updated": ["products", "plantings", "analysis"],
  "job.completed": ["admin-surveys", "admin-analysis", "admin-ai"],
  "job.stage_completed": ["admin-surveys"],
  "job.failed": ["admin-surveys"],
  "ranking.completed": ["admin-ai"],
  "specialist_request.updated": ["help", "admin-support"],
  "funding_interest.updated": ["funding", "admin-support"],
};

function SocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WsStatus>("closed");
  const handlers = useRef(new Set<EventHandler>());
  const client = useRef<WsClient | null>(null);
  const queryClientInstance = useQueryClient();
  const { language } = useI18n();

  useEffect(() => {
    const socket = new WsClient({
      onStatus: setStatus,
      onEvent: (message) => {
        for (const handler of handlers.current) handler(message);
        const keys = INVALIDATION[message.type];
        if (keys) {
          for (const key of keys) {
            void queryClientInstance.invalidateQueries({ queryKey: [key] });
          }
        }
      },
      onReady: () => {
        // On reconnect, refetch what might have changed while the socket was down.
        void queryClientInstance.invalidateQueries();
      },
    });
    client.current = socket;
    socket.connect();
    return () => {
      socket.close();
      client.current = null;
    };
    // The language is intentionally not a dependency: it does not affect the socket.
  }, [queryClientInstance, language]);

  const subscribe = useCallback((handler: EventHandler) => {
    handlers.current.add(handler);
    return () => handlers.current.delete(handler);
  }, []);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);
  return createContextProvider(SocketContext, value, children);
}

export function useSocket(): SocketValue {
  const value = useContext(SocketContext);
  if (value === null) throw new Error("useSocket must be used inside SocketProvider");
  return value;
}

/** Subscribe to socket events for the lifetime of a component. */
export function useSocketEvent(handler: EventHandler) {
  const { subscribe } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((message) => ref.current(message)), [subscribe]);
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <SocketProvider>{children}</SocketProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
