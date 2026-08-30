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

/**
 * Indexing, off the request.
 *
 * Runs from `after()` once the upload has responded, and from the sweeper for
 * anything left behind. It takes only a document id, because that is all a job
 * can rely on surviving: the request that started it may be long gone, and the
 * browser that uploaded the file may be closed. Everything else -- the bytes
 * included -- is re-read from what 3.3 stored.
 *
 * Uses the service-role client: there is no session here to act on behalf of.
 * Authorization was decided before the job was ever queued, by the route that
 * queued it.
 *
 * Never throws. A job that rejects in `after()` has nobody to catch it, and an
 * unhandled rejection in a background task is exactly the kind of failure that
 * leaves a row at `indexing` with no trace of why.
 */
export async function runIndexingJob(documentId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // The claim decides whether this worker proceeds at all. A false here is a
    // normal outcome, not an error: someone else got there first.
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

    // Best-effort: record the failure so the row does not sit at `indexing`
    // forever looking like work in progress. If even this fails, the sweeper
    // will find the row stale and try again.
    try {
      await markFailed(
        createAdminClient(),
        documentId,
        "Lập chỉ mục thất bại do lỗi hệ thống. Vui lòng thử lại.",
      );
    } catch {
      // Nothing left to do but leave it for the sweeper.
    }
  }
}
