import fs from "node:fs/promises";
import { DevinAcp, type DevinAcpEvents } from "./acp.js";
import { TerminalRunner } from "./terminal.js";
import { DEFAULT_AGENT, type AgentDef } from "./agents.js";

export interface ManagedProcess {
  acp: DevinAcp;
  cwd: string;
  startedAt: number;
}

export interface ManagerEvents extends Omit<DevinAcpEvents, "onExit"> {
  onExit: (cwd: string, code: number | null, agent: string, sessionId?: string) => void;
  /** Called with the owning process for each permission request. */
  onPermissionOwner: (requestId: string, owner: DevinAcp) => void;
}

/**
 * ACP child processes. Multi-session agents (Devin) get one pooled process
 * per workspace directory with sessions multiplexed by sessionId; single-
 * session agents (Prime) get a dedicated process per session.
 */
export class AcpManager {
  /** `${agent.id}:${cwd}` → pooled process (multi-session agents). */
  private pooled = new Map<string, ManagedProcess>();
  private starting = new Map<string, Promise<DevinAcp>>();
  /** sessionId → dedicated process (single-session agents). */
  private bySession = new Map<string, ManagedProcess>();
  readonly terminal = new TerminalRunner();

  constructor(private ev: ManagerEvents) {}

  private async spawn(cwd: string, agent: AgentDef, onExit: (code: number | null) => void): Promise<DevinAcp> {
    await fs.mkdir(cwd, { recursive: true });
    let instance: DevinAcp | null = null;
    const acp = await DevinAcp.start(
      cwd,
      this.terminal,
      {
        ...this.ev,
        onPermissionRequest: (requestId, sessionId, toolCall, options) => {
          if (instance) this.ev.onPermissionOwner(requestId, instance);
          this.ev.onPermissionRequest(requestId, sessionId, toolCall, options);
        },
        onExit,
      },
      agent,
    );
    instance = acp;
    return acp;
  }

  /** Get (or lazily start) the pooled process for a multi-session agent. */
  async get(cwd: string, agent: AgentDef = DEFAULT_AGENT): Promise<DevinAcp> {
    if (!agent.multiSession) {
      throw new Error(`${agent.label} runs one session per process — use startForSession`);
    }
    const key = `${agent.id}:${cwd}`;
    const existing = this.pooled.get(key);
    if (existing && !existing.acp.exited) return existing.acp;

    const pending = this.starting.get(key);
    if (pending) return pending;

    const p = (async () => {
      const acp = await this.spawn(cwd, agent, (code) => {
        this.pooled.delete(key);
        this.ev.onExit(cwd, code, agent.id);
      });
      this.pooled.set(key, { acp, cwd, startedAt: Date.now() });
      return acp;
    })();

    this.starting.set(key, p);
    try {
      return await p;
    } finally {
      this.starting.delete(key);
    }
  }

  /** Spawn a dedicated process for one session of a single-session agent. */
  async startForSession(cwd: string, agent: AgentDef): Promise<DevinAcp> {
    const acp = await this.spawn(cwd, agent, (code) => {
      let sessionId: string | undefined;
      for (const [sid, m] of this.bySession) {
        if (m.acp === acp) {
          sessionId = sid;
          this.bySession.delete(sid);
        }
      }
      this.ev.onExit(cwd, code, agent.id, sessionId);
    });
    return acp;
  }

  /** Register the session a dedicated process ended up hosting. */
  bindSession(sessionId: string, acp: DevinAcp): void {
    this.bySession.set(sessionId, { acp, cwd: acp.cwd, startedAt: Date.now() });
  }

  /** The live dedicated process for a session, if any. */
  forSession(sessionId: string): DevinAcp | undefined {
    const m = this.bySession.get(sessionId);
    return m && !m.acp.exited ? m.acp : undefined;
  }

  status() {
    const describe = (m: ManagedProcess, sessionId?: string) => ({
      cwd: m.cwd,
      agent: m.acp.agent.id,
      sessionId,
      startedAt: m.startedAt,
      exited: m.acp.exited,
      capabilities: {
        loadSession: m.acp.capabilities?.agentCapabilities?.loadSession ?? false,
        image: m.acp.capabilities?.agentCapabilities?.promptCapabilities?.image ?? false,
      },
    });
    return [
      ...[...this.pooled.values()].map((m) => describe(m)),
      ...[...this.bySession.entries()].map(([sid, m]) => describe(m, sid)),
    ];
  }

  killAll() {
    for (const m of this.pooled.values()) m.acp.kill();
    this.pooled.clear();
    for (const m of this.bySession.values()) m.acp.kill();
    this.bySession.clear();
    this.terminal.killAll();
  }
}
