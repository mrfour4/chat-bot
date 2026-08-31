import { after, NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { runIndexingQueue } from "@/lib/documents/queue";
import { listStale, resetToPending } from "@/lib/documents/repo";
import { STALE_AFTER_MS } from "@/lib/documents/status";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 90;

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

    const supabase = createAdminClient();
    const stale = await listStale(supabase, STALE_AFTER_MS);

    for (const document of stale) {
        await resetToPending(supabase, document.id);
    }

    if (stale.length > 0) after(() => runIndexingQueue());

    return NextResponse.json({
        requeued: stale.map((document) => document.id),
    });
}
