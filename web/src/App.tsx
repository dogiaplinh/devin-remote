import { lazy, Suspense, useEffect, useState } from "react";
import { refreshMeta, refreshSessions, setUi, useStore, hideNotice } from "./state";
import { startWs, stopWs } from "./ws";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { XIcon } from "lucide-react";
import { api, clearAuthToken, saveAuthToken } from "./api";
import LoginPage from "./components/LoginPage";
import type { AuthStatus } from "./types";

const TerminalPanel = lazy(() => import("./components/TerminalPanel"));
const AgentLogDrawer = lazy(() => import("./components/AgentLogDrawer"));
const SettingsModal = lazy(() => import("./components/SettingsModal"));
const UsagePanel = lazy(() => import("./components/UsagePanel"));
const CommandPalette = lazy(() => import("./components/CommandPalette"));

function applyTheme(theme: "dark" | "light" | "system"): void {
  // Light is the default; dark is opt-in via the .dark class.
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export default function App() {
  const state = useStore();
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    void api.authStatus().then((status) => {
      setAuth(status);
      if (!status.authenticated) clearAuthToken();
      if (status.authenticated) {
        void refreshMeta();
        void refreshSessions();
        startWs();
      }
      document.getElementById("dc-boot")?.remove();
    }).catch((error: unknown) => setAuthError(error instanceof Error ? error.message : "Unable to connect"));
  }, []);

  useEffect(() => {
    applyTheme(state.settings.theme ?? "light");
    if (state.settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [state.settings.theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setUi({ modal: state.ui.modal === "palette" ? null : "palette" });
      } else if (e.key === "Escape" && state.ui.modal) {
        setUi({ modal: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.ui.modal]);

  if (authError) {
    return <main className="flex h-full items-center justify-center text-sm text-destructive">{authError}</main>;
  }
  if (!auth) return null;

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearAuthToken();
      stopWs();
      setUi({ modal: null });
      setAuth({ ...auth, authenticated: false, token: undefined });
    }
  };

  if (auth.enabled && !auth.authenticated) {
    return (
      <LoginPage
        onLogin={async (username, password) => {
          try {
            const status = await api.login(username, password);
            if (status.token) saveAuthToken(status.token);
            setAuth(status);
            void refreshMeta();
            void refreshSessions();
            startWs();
            return null;
          } catch (error) {
            return error instanceof Error ? error.message : "Unable to sign in";
          }
        }}
      />
    );
  }

  const active = state.activeSessionId ? state.sessions[state.activeSessionId] ?? null : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full bg-background text-foreground">
        {state.ui.sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] md:hidden"
            aria-label="close sidebar"
            onClick={() => setUi({ sidebarOpen: false })}
          />
        )}
        <Sidebar onLogout={() => void logout()} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatView session={active} />
          <Suspense fallback={<DrawerSkeleton />}>
            {state.ui.terminalOpen && <TerminalPanel />}
            {state.ui.logOpen && <AgentLogDrawer />}
          </Suspense>
        </div>
        <Suspense fallback={null}>
          {state.ui.modal === "settings" && <SettingsModal onLogout={logout} />}
          {state.ui.modal === "usage" && <UsagePanel />}
          {state.ui.modal === "palette" && <CommandPalette />}
        </Suspense>
        {state.notice && (
          <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-popover px-3.5 py-2 text-sm text-popover-foreground shadow-xl">
            <span className="max-w-[70vw] truncate">{state.notice}</span>
            <button
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="dismiss"
              onClick={hideNotice}
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex h-56 flex-none flex-col gap-2 border-t border-border p-3">
      <Skeleton className="dc-shimmer h-8 rounded-md" />
      <Skeleton className="dc-shimmer min-h-0 flex-1 rounded-md" />
    </div>
  );
}
