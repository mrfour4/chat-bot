import "server-only";

import { indexDocument } from "@/lib/documents/indexer";
import {
    claimForIndexing,
    getDocument,
    markFailed,
    markReady,
} from "@/lib/documents/repo";
import { getPdf } from "@/lib/documents/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runIndexingJob(documentId: string): Promise<void> {
    try {
        const supabase = createAdminClient();

        const claimed = await claimForIndexing(supabase, documentId);
        if (!claimed) return;

        const document = await getDocument(supabase, documentId);
        if (!document) return;

        if (!document.storage_path) {
            await markFailed(
                supabase,
                documentId,
                "Không tìm thấy tệp PDF đã lưu. Vui lòng tải lên lại.",
            );
            return;
        }

        const bytes = await getPdf(supabase, document.storage_path);
        if (!bytes) {
            await markFailed(
                supabase,
                documentId,
                "Không đọc được tệp PDF đã lưu. Vui lòng tải lên lại.",
            );
            return;
        }

        const outcome = await indexDocument({
            documentId,
            fileName: document.file_name,
            bytes,
        });

        if (!outcome.ok) {
            await markFailed(supabase, documentId, outcome.message);
            return;
        }

        await markReady(supabase, documentId, outcome.geminiDocumentName);
    } catch (error) {
        console.error("[indexing] job failed for", documentId, error);

        try {
            await markFailed(
                createAdminClient(),
                documentId,
                "Lập chỉ mục thất bại do lỗi hệ thống. Vui lòng thử lại.",
            );
        } catch {}
    }
}
