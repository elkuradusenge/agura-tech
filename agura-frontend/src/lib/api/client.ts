/**
 * The API client.
 *
 * Every call goes through `request`, so the base URL, the bearer token, the
 * refresh on a 401 and the shared error envelope are handled in one place.
 */

import type { ApiErrorBody, AuthResponse } from "./types";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8000/api/v1";
export const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://127.0.0.1:8000/ws";

const ACCESS_KEY = "agura.access";
const REFRESH_KEY = "agura.refresh";
const ACCOUNT_KIND_KEY = "agura.account";

export type AccountKind = "user" | "admin";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly translationKey: string;
  readonly details: unknown;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    const detail = body?.error;
    super(detail?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = detail?.code ?? "unknown";
    this.translationKey = detail?.translation_key ?? "errors.generic";
    this.details = detail?.details;
  }
}

export const tokens = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  kind: () => localStorage.getItem(ACCOUNT_KIND_KEY) as AccountKind | null,
  save(access: string, refresh: string, kind: AccountKind) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(ACCOUNT_KIND_KEY, kind);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ACCOUNT_KIND_KEY);
  },
};

type Listener = () => void;
const authListeners = new Set<Listener>();

export function onAuthChange(listener: Listener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function emitAuthChange() {
  for (const listener of authListeners) listener();
}

export function signOutLocally() {
  tokens.clear();
  emitAuthChange();
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip the automatic refresh, used by the refresh call itself. */
  skipRefresh?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = path.startsWith("http") ? path : `${API_URL}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${base}?${suffix}` : base;
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.refresh();
  if (!refresh) return false;
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!response.ok) return false;
      const body = (await response.json()) as AuthResponse<unknown>;
      const kind = tokens.kind() ?? "user";
      tokens.save(body.access_token, body.refresh_token, kind);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, query, signal, skipRefresh } = options;
  const headers: Record<string, string> = {};
  const access = tokens.access();
  if (access) headers.Authorization = `Bearer ${access}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal,
  });

  if (response.status === 401 && !skipRefresh && tokens.refresh()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryHeaders = { ...headers };
      const nextAccess = tokens.access();
      if (nextAccess) retryHeaders.Authorization = `Bearer ${nextAccess}`;
      response = await fetch(buildUrl(path, query), {
        method,
        headers: retryHeaders,
        body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
        signal,
      });
    } else {
      signOutLocally();
    }
  }

  if (!response.ok) {
    let payload: ApiErrorBody | null = null;
    try {
      payload = (await response.json()) as ApiErrorBody;
    } catch {
      payload = null;
    }
    throw new ApiError(response.status, payload, response.statusText || "Request failed");
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return (await response.text()) as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
  upload: <T>(path: string, file: File, fields: Record<string, string>) => {
    const formData = new FormData();
    formData.append("file", file);
    for (const [key, value] of Object.entries(fields)) formData.append(key, value);
    return request<T>(path, { method: "POST", formData });
  },
};
