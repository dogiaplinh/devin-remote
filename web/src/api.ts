import type {
  MetaResponse,
  PromptBlock,
  PromptDoneResult,
  SessionSummary,
  Settings,
  SessionUpdate,
  UploadMeta,
  UsageResponse,
  AuthStatus,
} from "./types";

export const AUTH_TOKEN_KEY = "devin-remote-auth-token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    /* localStorage may be unavailable in restricted browser contexts */
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* localStorage may be unavailable in restricted browser contexts */
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
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
  authStatus: () => req<AuthStatus>("GET", "/api/auth/status"),
  login: (username: string, password: string) => req<AuthStatus>("POST", "/api/auth/login", { username, password }),
  logout: () => req<{ ok: boolean }>("POST", "/api/auth/logout"),
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

  exportUrl: (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}/export`,

  resolvePermission: (requestId: string, optionId: string | null) =>
    req<{ ok: boolean }>("POST", `/api/permissions/${encodeURIComponent(requestId)}`, { optionId }),

  upload: async (file: Blob, filename: string): Promise<UploadMeta> => {
    const token = getAuthToken();
    const res = await fetch(`/api/uploads?filename=${encodeURIComponent(filename)}`, {
      method: "POST",
      headers: {
        "content-type": file.type || "application/octet-stream",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });
    if (!res.ok) throw new Error(`upload failed → ${res.status}`);
    return (await res.json()) as UploadMeta;
  },

  usage: () => req<UsageResponse>("GET", "/api/usage"),

  getSettings: () => req<Settings>("GET", "/api/settings"),

  putSettings: (patch: Partial<Settings>) => req<Settings>("PUT", "/api/settings", patch),
};
