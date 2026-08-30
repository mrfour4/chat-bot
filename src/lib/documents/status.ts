import type { DocumentStatus } from "@/lib/db";

/**
 * A document is still being worked on, so the list should keep polling.
 *
 * `pending` and `indexing` are both in-flight: the first means the row exists
 * and its PDF is stored but no worker has claimed it, the second that one has.
 * Both settle on their own, and neither is something the teacher can act on.
 */
export function isPending(status: DocumentStatus): boolean {
  return status === "pending" || status === "indexing";
}

/**
 * How long a document may sit mid-flight before we assume its worker is gone.
 *
 * Indexing is capped at 60s inside `indexDocument`, so three minutes is well
 * clear of a slow but healthy run. Lives here rather than in the sweeper
 * because the panel and the route must agree: if the panel nudged sooner than
 * the route considered a row stale, it would ask on every poll and be told
 * nothing every time -- a busy loop that looks like it is working.
 */
export const STALE_AFTER_MS = 3 * 60 * 1000;

/**
 * In flight, but for long enough that nothing is plausibly still running.
 *
 * `now` is a parameter so this is a pure function of its inputs rather than of
 * the clock.
 */
export function isStale(
  document: { status: DocumentStatus; updated_at: string },
  now: number = Date.now(),
): boolean {
  if (!isPending(document.status)) return false;

  const updatedAt = new Date(document.updated_at).getTime();
  // An unparseable timestamp must not read as "stale forever", which would
  // requeue the row on every poll.
  if (Number.isNaN(updatedAt)) return false;

  return now - updatedAt > STALE_AFTER_MS;
}
