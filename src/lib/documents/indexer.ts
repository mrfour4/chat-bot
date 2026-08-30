import "server-only";

import { describeError } from "@/lib/documents/errors";
import { getFileSearchStore, getGemini } from "@/lib/gemini/client";
import { classifyGeminiError } from "@/lib/gemini/errors";

/**
 * Roughly 4x the slowest indexing run measured in the 2.1.0 spike
 * (10.0-14.6s for a 25-page text PDF and a 12-page scan).
 */
export const INDEXING_TIMEOUT_MS = 60_000;

const POLL_INTERVAL_MS = 2_000;

/**
 * The custom-metadata key carrying our Supabase `documents.id`.
 *
 * Lowercase deliberately -- see the note at the upload call. Exported because
 * 2.2.2 reads the same key back off `retrievedContext.customMetadata` to
 * resolve a citation to a row, and the two must not drift apart.
 */
export const DOCUMENT_ID_KEY = "docid";

/**
 * Retry budgets, deliberately asymmetric.
 *
 * A 503 is a genuinely transient capacity blip and is worth a few attempts. A
 * 429 is the daily quota, and retrying it mostly spends quota that is already
 * gone -- so it gets one attempt, and only when the server's own suggested
 * delay is short enough to be worth waiting for.
 */
const MAX_UNAVAILABLE_ATTEMPTS = 3;
const MAX_QUOTA_ATTEMPTS = 2;
const MAX_QUOTA_WAIT_MS = 10_000;

/**
 * Runs `fn`, retrying only transient failures and only on the API's own terms:
 * it tells us how long to wait, so we use its number rather than inventing a
 * backoff curve.
 */
async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const failure = classifyGeminiError(error);

      const limit =
        failure.kind === "unavailable"
          ? MAX_UNAVAILABLE_ATTEMPTS
          : failure.kind === "quota"
            ? MAX_QUOTA_ATTEMPTS
            : 0;

      const wait = failure.retryAfterMs ?? 3_000 * attempt;
      const worthWaiting =
        failure.kind !== "quota" || wait <= MAX_QUOTA_WAIT_MS;

      if (attempt >= limit || !worthWaiting) throw error;

      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

export type IndexOutcome =
  | { ok: true; geminiDocumentName: string; chunkCount: number }
  | { ok: false; message: string };

/**
 * A short prompt whose only job is to make retrieval run. We read the grounding
 * metadata, not the answer.
 */
const PROBE_PROMPT = "Tài liệu này nói về nội dung gì?";

/**
 * The probe needs *availability*, not answer quality -- its text is discarded
 * and only the grounding metadata is read. So it deliberately does not use the
 * app's answering model: during 2.1.0, `gemini-3.7-flash` returned 503 for ~75s
 * straight, and letting that block uploads would be paying the cost of the
 * newest model for none of its benefit. The answering model stays decision D7.
 */
const PROBE_MODEL = process.env.GEMINI_PROBE_MODEL ?? "gemini-3.6-flash";

/**
 * Uploads a PDF into the File Search store and confirms it is actually
 * retrievable before reporting success.
 *
 * Returns rather than throws: a timeout, a 503 and an unreadable file are all
 * expected operational weather, and the caller's response to every one of them
 * is the same.
 */
export async function indexDocument(input: {
  documentId: string;
  fileName: string;
  bytes: Uint8Array;
}): Promise<IndexOutcome> {
  const ai = getGemini();
  const store = getFileSearchStore();

  // Tracked outside the try so a failure *after* a successful upload can still
  // clean up. Without this, any throw between upload and success leaves a
  // document in the store with nothing in Postgres pointing at it.
  let uploadedName: string | undefined;

  try {
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName: store,
      file: new Blob([input.bytes as BufferSource], {
        type: "application/pdf",
      }),
      config: {
        mimeType: "application/pdf",
        displayName: input.fileName,
        // An array of {key, stringValue} -- not a plain object. This is what
        // makes the scoped check below possible and what lets a citation
        // resolve back to a Supabase row.
        //
        // The key MUST be lowercase. Verified the hard way in 2.1.5: with the
        // key stored as `documentId`, a metadataFilter of `documentId=<value>`
        // returns zero chunks, and so does `documentid=<value>` -- while the
        // identical value under the key `docid` matches. Hyphens in the value
        // are fine; the uppercase letter in the key is not.
        customMetadata: [
          { key: DOCUMENT_ID_KEY, stringValue: input.documentId },
        ],
      },
    });

    const deadline = Date.now() + INDEXING_TIMEOUT_MS;
    while (!operation.done) {
      if (Date.now() > deadline) {
        return {
          ok: false,
          message:
            `Quá thời gian chờ lập chỉ mục (${INDEXING_TIMEOUT_MS / 1000} giây). ` +
            "Vui lòng thử lại.",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      operation = await ai.operations.get({ operation });
    }

    if (operation.error) {
      return { ok: false, message: describeError(operation.error.message) };
    }

    const geminiDocumentName = operation.response?.documentName;
    uploadedName = geminiDocumentName;
    if (!geminiDocumentName) {
      return {
        ok: false,
        message: "Gemini không trả về mã tài liệu sau khi lập chỉ mục.",
      };
    }

    // The point of this function. There is no metadata field that reveals an
    // empty index -- sizeBytes reports raw uploaded bytes and state reads
    // STATE_ACTIVE either way -- so the only way to know the document is
    // genuinely retrievable is to retrieve from it.
    const chunkCount = await countRetrievableChunks(input.documentId);
    if (chunkCount === 0) {
      await discard(geminiDocumentName);
      return {
        ok: false,
        message:
          "Không đọc được nội dung từ tệp này. Tài liệu đã tải lên nhưng không " +
          "trích xuất được văn bản nào, nên trợ lý sẽ không thể trả lời dựa trên nó.",
      };
    }

    return { ok: true, geminiDocumentName, chunkCount };
  } catch (error) {
    if (uploadedName) await discard(uploadedName);

    // Raw SDK errors are JSON blobs about quota metrics. `describeError` makes
    // them short and safe, but only this makes them mean something to the
    // teacher reading the row.
    const failure = classifyGeminiError(error);
    if (failure.kind !== "other") {
      console.error(`[indexing] ${failure.kind}: ${failure.detail}`);
    }
    return { ok: false, message: failure.message };
  }
}

/**
 * How many chunks retrieval can actually find in this one document.
 *
 * Scoped with `metadataFilter`, because in a shared store "no chunks came back"
 * otherwise means the other documents simply ranked higher -- a distinction
 * that nearly sent the 2.1.0 spike to the wrong conclusion.
 */
async function countRetrievableChunks(documentId: string): Promise<number> {
  const response = await withTransientRetry(() =>
    getGemini().models.generateContent({
      model: PROBE_MODEL,
      contents: PROBE_PROMPT,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [getFileSearchStore()],
              metadataFilter: `${DOCUMENT_ID_KEY}=${documentId}`,
            },
          },
        ],
      },
    }),
  );

  return (
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.length ?? 0
  );
}

/**
 * Removes a document from the File Search store.
 *
 * `force` is required: a Document with chunks refuses deletion with
 * `400 FAILED_PRECONDITION -- Cannot delete non-empty Document`, and every real
 * document has chunks (2.1.0).
 *
 * A 404 is success: the goal state is that the document is not in the store,
 * and it already is not. Treating "already gone" as an error would break the
 * retry that makes a half-completed deletion self-healing.
 */
export async function deleteFromStore(geminiDocumentName: string): Promise<void> {
  try {
    await getGemini().fileSearchStores.documents.delete({
      name: geminiDocumentName,
      config: { force: true },
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return;
    throw error;
  }
}

/**
 * Removes a document we uploaded but are about to report as failed.
 *
 * Every path that returns `ok: false` after a successful upload goes through
 * here. The upload and the verification are separate operations, so the second
 * failing does not undo the first -- and an orphan is invisible to the teacher,
 * undeletable through the UI, and still occupying quota.
 *
 * `force` is required: a Document with chunks refuses deletion without it.
 * Failure to clean up must not mask the original problem, so this never throws.
 */
async function discard(geminiDocumentName: string): Promise<void> {
  try {
    await deleteFromStore(geminiDocumentName);
  } catch {
    // Leaving an orphan is worse than nothing, but it is not what the teacher
    // needs to hear about.
  }
}
