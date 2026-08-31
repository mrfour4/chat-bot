import "server-only";

import { runIndexingJob } from "@/lib/documents/job";
import { nextPendingDocument } from "@/lib/documents/repo";
import { createAdminClient } from "@/lib/supabase/admin";

export const QUEUE_BUDGET_MS = 4 * 60 * 1000;

let running: Promise<void> | null = null;

export function runIndexingQueue(): Promise<void> {
    running ??= drain().finally(() => {
        running = null;
    });

    return running;
}

async function drain(): Promise<void> {
    const supabase = createAdminClient();
    const deadline = Date.now() + QUEUE_BUDGET_MS;
    const skip: string[] = [];

    while (Date.now() < deadline) {
        let next;
        try {
            next = await nextPendingDocument(supabase, skip);
        } catch (error) {
            console.error("[indexing] could not read the queue", error);
            return;
        }

        if (!next) return;

        const indexed = await runIndexingJob(next.id);

        if (!indexed) skip.push(next.id);
    }
}
