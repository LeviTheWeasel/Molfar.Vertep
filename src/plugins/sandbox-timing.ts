// Where a sandbox call's time went (#422). The plugin time limit is a wall clock, so a call can run out of it
// without doing much: waiting is not counted (the data-folder gate and a free worker come before the clock
// starts), but everything inside the call is: host work the script asked for, another call that shares the
// worker's thread, and time the device gave the engine no CPU. The worker measures (sandbox-worker.mjs,
// `activeCalls`), the host adds its waits, and this turns the numbers into a log line and a sentence for the
// time-limit error a user sees in a toast.

export interface SandboxTiming {
  /** Worker clock when the call started running. */
  startedAt: number;
  /** From the start in the worker to the answer. */
  runMs: number;
  /** CPU the whole engine process used meanwhile (all threads); null where the runtime cannot tell. */
  cpuMs: number | null;
  /** Stretches of PAUSE_MS or more with no step of the script, summed, and the longest. */
  pausedMs: number;
  longestPauseMs: number;
  /** Other calls that ran in the same worker during this one. */
  overlap: number;
  /** Host side: waiting for the plugin's data folder (another call writing it) and for a free worker. */
  gateMs?: number;
  queueMs?: number;
}

/** A call slower than this in all is written to the log. */
export const SLOW_CALL_MS = 5000;

const TIME_LIMIT = /maximum allowed time limit|interrupted/i;
export const isTimeLimitError = (error: string | undefined): boolean => !!error && TIME_LIMIT.test(error);

const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function totalMs(t: SandboxTiming): number {
  return (t.gateMs ?? 0) + (t.queueMs ?? 0) + t.runMs;
}

/** The numbers, for the log. */
export function timingLine(t: SandboxTiming): string {
  const parts = [
    `${sec(totalMs(t))} in all`,
    `waited ${sec(t.gateMs ?? 0)} for the data folder and ${sec(t.queueMs ?? 0)} for a worker (starting one included)`,
    `ran ${sec(t.runMs)}`,
    t.cpuMs == null ? "engine CPU unknown" : `engine CPU ${sec(t.cpuMs)}`,
    `script stood still ${sec(t.pausedMs)} (longest ${sec(t.longestPauseMs)})`,
    `${t.overlap} other call(s) in the same worker`,
  ];
  return parts.join(", ");
}

/** What most likely ate the time, in words for the user; null when the numbers say nothing clear. */
export function timingCause(t: SandboxTiming): string | null {
  if (t.runMs <= 0) return null;
  const starved = t.cpuMs != null && t.cpuMs < t.runMs * 0.5;
  if (starved && t.pausedMs >= t.runMs * 0.3) {
    return "the device gave the engine little CPU during the call (a phone pausing the engine app in the background, or a computer busy with something else)";
  }
  if (t.overlap > 0 && t.pausedMs >= t.runMs * 0.3) return "other plugin calls ran in the same worker at the same time";
  if (t.pausedMs < t.runMs * 0.3) return "the plugin's own work took this long";
  return null;
}

/** The sentence added to a time-limit error: how long, and the likely cause. */
export function timingNote(t: SandboxTiming): string {
  const cause = timingCause(t);
  const cpu = t.cpuMs == null ? "" : `, engine CPU ${sec(t.cpuMs)}`;
  return `(ran ${sec(t.runMs)}${cpu}, script stood still ${sec(t.pausedMs)}${t.overlap ? `, ${t.overlap} other call(s) in its worker` : ""}${cause ? `: ${cause}` : ""})`;
}
