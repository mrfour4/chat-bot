import type { DocumentStatus } from "@/lib/db";

/**
 * A document is still being worked on, so the list should keep polling.
 *
 * `pending` and `indexing` are both in-flight: the first means the row exists
 * but Gemini has not been called yet, the second that it has. Both settle on
 * their own, and neither is something the teacher can act on.
 */
export function isPending(status: DocumentStatus): boolean {
  return status === "pending" || status === "indexing";
}
