import type {
  MetaResponse,
  PromptBlock,
  PromptDoneResult,
  SessionSummary,
  Settings,
  SessionUpdate,
  UploadMeta,
  UsageResponse,
} from "./types";

export interface AuthStatus {
  enabled: boolean;
  valid?: boolean;
}

let authToken: string | null = sessionStorage.getItem("devin-remote-token");

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) sessionStorage.setItem("devin-remote-token", token);
  else sessionStorage.removeItem("devin-remote-token");
}

export function getAuthToken(): string | null {
  return authToken;
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${method} ${url} → ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) msg = data.error;
    } catch {
      /* keep generic message */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  authStatus: () => req<AuthStatus>("GET", "/api/auth"),
  verifyToken: (token: string) => req<AuthStatus>("POST", "/api/auth", { token }),

  meta: () => req<MetaResponse>("GET", "/api/meta"),

  listSessions: () => req<{ sessions: SessionSummary[] }>("GET", "/api/sessions"),

  createSession: (cwd: string) =>
    req<{ sessionId: string; cwd: string; modes: unknown }>("POST", "/api/sessions", { cwd }),

  openSession: (sessionId: string, cwd?: string) =>
    req<{ ok: boolean }>("POST", `/api/sessions/${encodeURIComponent(sessionId)}/open`, { cwd }),

  prompt: (sessionId: string, blocks: PromptBlock[], cwd?: string) =>
    req<PromptDoneResult>("POST", `/api/sessions/${encodeURIComponent(sessionId)}/prompt`, { cwd, blocks }),

  cancel: (sessionId: string, cwd?: string) =>
    req<{ ok: boolean }>("POST", `/api/sessions/${encodeURIComponent(sessionId)}/cancel`, { cwd }),

  rename: (sessionId: string, title: string, cwd?: string) =>
    req<{ ok: boolean; remote: boolean }>("POST", `/api/sessions/${encodeURIComponent(sessionId)}/rename`, {
      title,
      cwd,
    }),

  setConfig: (sessionId: string, configId: "mode" | "model", value: string, cwd?: string) =>
    req<unknown>("POST", `/api/sessions/${encodeURIComponent(sessionId)}/config`, { configId, value, cwd }),

  history: (sessionId: string) =>
    req<{ updates: SessionUpdate[] }>("GET", `/api/sessions/${encodeURIComponent(sessionId)}/history`),

  exportUrl: (sessionId: string) => {
    const token = getAuthToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    return `/api/sessions/${encodeURIComponent(sessionId)}/export${qs}`;
  },

  resolvePermission: (requestId: string, optionId: string | null) =>
    req<{ ok: boolean }>("POST", `/api/permissions/${encodeURIComponent(requestId)}`, { optionId }),

  upload: async (file: Blob, filename: string): Promise<UploadMeta> => {
    const headers: Record<string, string> = { "content-type": file.type || "application/octet-stream" };
    if (authToken) headers.authorization = `Bearer ${authToken}`;
    const res = await fetch(`/api/uploads?filename=${encodeURIComponent(filename)}`, {
      method: "POST",
      headers,
      body: file,
    });
    if (!res.ok) throw new Error(`upload failed → ${res.status}`);
    return (await res.json()) as UploadMeta;
  },

  usage: () => req<UsageResponse>("GET", "/api/usage"),

  getSettings: () => req<Settings>("GET", "/api/settings"),

  putSettings: (patch: Partial<Settings>) => req<Settings>("PUT", "/api/settings", patch),
};
