// Keeping a provider's prompt cache alive between chat replies (#112).
//
// A provider keeps the start of a request in its cache for a few minutes (about 5 for Claude and GPT), and
// reading it renews that time. After a reply this holds the request that made it; a timer replays the same
// request with a tiny answer limit every PING_MS and throws the answer away, so the next real message still
// finds its long prompt cached (a read costs about a tenth of the input price). It writes nothing to any
// chat: it is a request to the provider and nothing else.
//
// The bounds are what keep it from being a drain: at most MAX_PINGS after the last reply (about 40 minutes of
// silence), a real request for the same chat stops it, and a model whose first ping did not read the cache
// is blocked until the user changes its setting, since it would only pay for nothing.
// The caller (models.ts) decides which replies qualify and what a ping is; this only keeps time.

export const PING_MS = 280_000;
export const MAX_PINGS = 8;

export interface PingResult {
  cacheRead: number;
  cacheWrite: number;
  input: number;
}

export interface KeepaliveStatus {
  /** Keep-alive requests sent since the engine started. */
  sent: number;
  lastAt: number | null;
  /** Tokens the last request read from the cache. */
  lastRead: number | null;
  /** Chats it is keeping warm right now. */
  active: number;
  /** Why it stopped, in words for the user; null while nothing went wrong. */
  stopped: string | null;
}

export interface Timers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realTimers: Timers = {
  set: (fn, ms) => {
    const h = setTimeout(fn, ms);
    (h as { unref?: () => void }).unref?.();
    return h;
  },
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

interface Session {
  ref: string;
  send: () => Promise<PingResult>;
  pings: number;
  timer: unknown;
}

interface Stat {
  sent: number;
  lastAt: number | null;
  lastRead: number | null;
  stopped: string | null;
  /** The first request read nothing: no more until the setting changes. */
  blocked: boolean;
}

export class CacheKeepalive {
  private sessions = new Map<string, Session>();
  private stats = new Map<string, Stat>();

  constructor(
    private readonly timers: Timers = realTimers,
    private readonly pingMs: number = PING_MS,
    private readonly maxPings: number = MAX_PINGS,
    private readonly now: () => number = Date.now,
  ) {}

  private stat(ref: string): Stat {
    let s = this.stats.get(ref);
    if (!s) {
      s = { sent: 0, lastAt: null, lastRead: null, stopped: null, blocked: false };
      this.stats.set(ref, s);
    }
    return s;
  }

  /** A reply just finished for `key`: hold its request and start the clock again. */
  arm(key: string, ref: string, send: () => Promise<PingResult>): void {
    this.pause(key);
    const stat = this.stat(ref);
    if (stat.blocked) return;
    const session: Session = { ref, send, pings: 0, timer: null };
    this.sessions.set(key, session);
    this.schedule(key, session);
  }

  /** A real request for `key` is starting (or the chat is gone): nothing is kept for it until its reply ends. */
  pause(key: string): void {
    const s = this.sessions.get(key);
    if (!s) return;
    this.timers.clear(s.timer);
    this.sessions.delete(key);
  }

  /** The user changed the model's setting: forget what was held for it and any block. */
  reset(ref: string): void {
    for (const [key, s] of [...this.sessions]) if (s.ref === ref) this.pause(key);
    this.stats.delete(ref);
  }

  status(ref: string): KeepaliveStatus {
    const s = this.stats.get(ref);
    let active = 0;
    for (const session of this.sessions.values()) if (session.ref === ref) active++;
    return { sent: s?.sent ?? 0, lastAt: s?.lastAt ?? null, lastRead: s?.lastRead ?? null, active, stopped: s?.stopped ?? null };
  }

  stopAll(): void {
    for (const key of [...this.sessions.keys()]) this.pause(key);
  }

  private schedule(key: string, session: Session): void {
    session.timer = this.timers.set(() => void this.tick(key, session), this.pingMs);
  }

  private async tick(key: string, session: Session): Promise<void> {
    if (this.sessions.get(key) !== session) return;
    const stat = this.stat(session.ref);
    let result: PingResult;
    try {
      result = await session.send();
    } catch (e) {
      if (this.sessions.get(key) === session) this.sessions.delete(key);
      stat.stopped = `A keep-alive request failed, so it stopped: ${(e as Error).message || String(e)}`;
      return;
    }
    // a real request came while the ping was out: the reply that follows arms it again
    if (this.sessions.get(key) !== session) return;
    stat.sent++;
    stat.lastAt = this.now();
    stat.lastRead = result.cacheRead;
    if (result.cacheRead <= 0) {
      this.sessions.delete(key);
      stat.blocked = true;
      stat.stopped = "The provider did not read the cache on the keep-alive request, so keep-alive stopped for this model. Check the cache, or change the setting to start again.";
      return;
    }
    stat.stopped = null;
    session.pings++;
    if (session.pings >= this.maxPings) {
      this.sessions.delete(key);
      return;
    }
    this.schedule(key, session);
  }
}
