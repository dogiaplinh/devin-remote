import { lazy, Suspense, useEffect, useState } from "react";
import { refreshMeta, refreshSessions, setUi, useStore, hideNotice, checkAuth, login } from "./state";
import { startWs } from "./ws";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { XIcon } from "lucide-react";

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
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    void checkAuth().then((auth) => {
      if (auth.authenticated) {
        void refreshMeta();
        void refreshSessions();
        startWs();
      }
    });
    // Replace the inline boot splash with the React tree.
    document.getElementById("dc-boot")?.remove();
  }, []);

  useEffect(() => {
    if (state.auth.authenticated) {
      void refreshMeta();
      void refreshSessions();
      startWs();
    }
  }, [state.auth.authenticated]);

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

  const active = state.activeSessionId ? state.sessions[state.activeSessionId] ?? null : null;

  if (state.auth.checking) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground">
        <div className="text-muted-foreground">Checking authentication…</div>
      </div>
    );
  }

  if (state.auth.enabled && !state.auth.authenticated) {
    return (
      <div className="flex h-full items-center justify-center bg-background p-4 text-foreground">
        <form
          className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            void login(tokenInput);
          }}
        >
          <h1 className="text-lg font-semibold">Devin Remote</h1>
          <p className="text-sm text-muted-foreground">Enter the server token to continue.</p>
          <Input
            type="password"
            placeholder="Token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoFocus
          />
          {state.auth.error && <p className="text-sm text-destructive">{state.auth.error}</p>}
          <Button type="submit" disabled={!tokenInput.trim() || state.auth.checking}>
            Sign in
          </Button>
        </form>
      </div>
    );
  }

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
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatView session={active} />
          <Suspense fallback={<DrawerSkeleton />}>
            {state.ui.terminalOpen && <TerminalPanel />}
            {state.ui.logOpen && <AgentLogDrawer />}
          </Suspense>
        </div>
        <Suspense fallback={null}>
          {state.ui.modal === "settings" && <SettingsModal />}
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
