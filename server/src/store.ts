import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import type { AgentSessionRecord, StoreShape, UsageRecord } from "./types.js";

const DEFAULTS: StoreShape = {
  aliases: {},
  workspaces: [],
  usage: [],
  agentSessions: {},
  settings: {
    theme: "dark",
    soundComplete: true,
    soundNotify: true,
    desktopNotify: false,
  },
};

const MAX_USAGE_RECORDS = 50_000;
const MAX_WORKSPACES = 1_000;

export class Store {
  readonly dataDir: string;
  readonly uploadsDir: string;
  private file: string;
  private data: StoreShape;
  private saveTimer: NodeJS.Timeout | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private tmpSeq = 0;

  constructor() {
    this.dataDir =
      process.env.DEVIN_REMOTE_HOME ??
      process.env.DEVIN_CONSOLE_HOME ??
      path.join(os.homedir(), ".devin-remote");
    // One-time migration from the pre-0.3 data dir.
    const legacy = path.join(os.homedir(), ".devin-console");
    if (!process.env.DEVIN_REMOTE_HOME && !fs.existsSync(this.dataDir) && fs.existsSync(legacy)) {
      fs.cpSync(legacy, this.dataDir, { recursive: true });
    }
    this.uploadsDir = path.join(this.dataDir, "uploads");
    this.file = path.join(this.dataDir, "store.json");
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    // Sweep temp files left by writes interrupted before their rename.
    for (const f of fs.readdirSync(this.dataDir)) {
      if (f.startsWith("store.json.") && f.endsWith(".tmp")) {
        try {
          fs.unlinkSync(path.join(this.dataDir, f));
        } catch {
          /* already gone */
        }
      }
    }
    this.data = this.load();
  }

  private load(): StoreShape {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return {
        ...DEFAULTS,
        ...raw,
        settings: { ...DEFAULTS.settings, ...(raw.settings ?? {}) },
        workspaces: Array.isArray(raw.workspaces) ? raw.workspaces.slice(-MAX_WORKSPACES) : DEFAULTS.workspaces,
        usage: Array.isArray(raw.usage) ? raw.usage.slice(-MAX_USAGE_RECORDS) : DEFAULTS.usage,
      };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  private save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persist();
    }, 250);
  }

  /**
   * Atomic write: unique temp file + rename, serialized on a chain. A direct
   * writeFile can be read back torn (crash mid-write), and a shared temp path
   * lets two overlapping writes rename half-written JSON into place.
   */
  private persist() {
    const json = JSON.stringify(this.data, null, 2);
    const tmp = `${this.file}.${process.pid}.${++this.tmpSeq}.tmp`;
    this.writeChain = this.writeChain
      .then(async () => {
        await fsp.writeFile(tmp, json);
        await fsp.rename(tmp, this.file);
      })
      .catch((err) => {
        console.error(`store: failed to write ${this.file}:`, err);
        void fsp.unlink(tmp).catch(() => {});
      });
  }

  async flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const json = JSON.stringify(this.data, null, 2);
    const tmp = `${this.file}.${process.pid}.${++this.tmpSeq}.tmp`;
    this.writeChain = this.writeChain.then(async () => {
      try {
        await fsp.writeFile(tmp, json);
        await fsp.rename(tmp, this.file);
      } catch (err) {
        console.error(`store: failed to flush ${this.file}:`, err);
        void fsp.unlink(tmp).catch(() => {});
      }
    });
    await this.writeChain;
  }

  get settings() {
    return structuredClone(this.data.settings);
  }

  setSettings(patch: Partial<StoreShape["settings"]>) {
    Object.assign(this.data.settings, patch);
    this.save();
    return this.settings;
  }

  alias(sessionId: string): string | undefined {
    return this.data.aliases[sessionId];
  }

  setAlias(sessionId: string, title: string) {
    if (title) this.data.aliases[sessionId] = title;
    else delete this.data.aliases[sessionId];
    this.save();
  }

  aliases(): Record<string, string> {
    return structuredClone(this.data.aliases);
  }

  workspaces(): string[] {
    return this.data.workspaces.slice();
  }

  addWorkspace(cwd: string) {
    if (!this.data.workspaces.includes(cwd)) {
      if (this.data.workspaces.length >= MAX_WORKSPACES) this.data.workspaces.shift();
      this.data.workspaces.push(cwd);
      this.save();
    }
  }

  agentSession(sessionId: string): AgentSessionRecord | undefined {
    const rec = this.data.agentSessions[sessionId];
    return rec ? { ...rec } : undefined;
  }

  agentSessions(): Record<string, AgentSessionRecord> {
    return structuredClone(this.data.agentSessions);
  }

  addAgentSession(sessionId: string, agent: string, cwd: string) {
    const now = Date.now();
    this.data.agentSessions[sessionId] = { agent, cwd, createdAt: now, updatedAt: now };
    this.save();
  }

  touchAgentSession(sessionId: string) {
    const rec = this.data.agentSessions[sessionId];
    if (rec) {
      rec.updatedAt = Date.now();
      this.save();
    }
  }

  recordUsage(rec: UsageRecord) {
    this.data.usage.push(rec);
    if (this.data.usage.length > MAX_USAGE_RECORDS) {
      this.data.usage = this.data.usage.slice(-MAX_USAGE_RECORDS);
    }
    this.save();
  }

  usage(): UsageRecord[] {
    return this.data.usage.slice();
  }
}
