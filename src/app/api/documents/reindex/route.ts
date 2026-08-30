import { after, NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { runIndexingJob } from "@/lib/documents/job";
import { listStale, resetToPending } from "@/lib/documents/repo";
import { STALE_AFTER_MS } from "@/lib/documents/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 90;

/**
 * Re-drives documents left mid-flight.
 *
 * `after()` is a promise on a process that may not survive -- a crash, a
 * timeout, a redeploy mid-index -- and without this a document would sit at
 * "Đang lập chỉ mục" forever, looking like work in progress. This is what turns
 * that into a delay.
 *
 * It is only safe because 3.3 keeps the PDF: the job re-reads the file from
 * storage rather than needing the browser that uploaded it.
 *
 * Two callers, deliberately:
 *   - the teacher's documents page, while anything is in flight, which covers
 *     the realistic case without any scheduling infrastructure;
 *   - a cron, via `x-reindex-secret`, which covers the case where nobody is
 *     looking. Configured only if REINDEX_SECRET is set.
 *
 * The threshold is imported rather than restated: if this route considered a
 * row stale later than the panel did, the panel would ask on every poll and be
 * told nothing every time -- a busy loop that looks like it is working.
 */

export async function POST(request: Request) {
    const secret = process.env.REINDEX_SECRET;
    const presented = request.headers.get("x-reindex-secret");
    const authorizedByCron = Boolean(secret) && presented === secret;

    if (!authorizedByCron) {
        const teacher = await getTeacher();
        if (!teacher) {
            const [user, t] = await Promise.all([
                getSessionUser(),
                apiMessages(),
            ]);
            return NextResponse.json(
                user
                    ? {
                          code: "forbidden",
                          message: t("forbidden"),
                      }
                    : {
                          code: "unauthenticated",
                          message: t("unauthenticated"),
                      },
                { status: user ? 403 : 401 },
            );
        }
    }

    // Service-role: a cron caller has no session, and the sweeper has to see
    // every teacher's stuck documents rather than only the caller's.
    const supabase = createAdminClient();
    const stale = await listStale(supabase, STALE_AFTER_MS);

    for (const document of stale) {
        // Back to `pending` first, so the job's claim has something to claim. A row
        // stuck at `indexing` would be skipped by its own worker otherwise.
        await resetToPending(supabase, document.id);
        after(() => runIndexingJob(document.id));
    }

    return NextResponse.json({
        requeued: stale.map((document) => document.id),
    });
}
