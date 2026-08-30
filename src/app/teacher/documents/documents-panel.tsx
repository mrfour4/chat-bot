"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DocumentRow } from "@/lib/db";
import { formatFileSize } from "@/lib/documents/format";
import { isPending } from "@/lib/documents/status";

const STATUS: Record<
  DocumentRow["status"],
  { text: string; className: string }
> = {
  pending: { text: "Chờ xử lý", className: "text-pending" },
  indexing: { text: "Đang lập chỉ mục", className: "text-pending" },
  ready: { text: "Sẵn sàng", className: "text-verified" },
  failed: { text: "Thất bại", className: "text-lacquer" },
};

const POLL_INTERVAL_MS = 3000;

export function DocumentsPanel({ initial }: { initial: DocumentRow[] }) {
  const [documents, setDocuments] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (!response.ok) return;
      const body: { documents: DocumentRow[] } = await response.json();
      setDocuments(body.documents);
    } catch {
      // A failed poll is not worth interrupting the page for; the next one runs.
    }
  }, []);

  // Only while something is actually in flight. With synchronous indexing this
  // is usually redundant -- it exists for the case where a request is
  // interrupted after the row is created, which would otherwise leave the list
  // permanently stale.
  const waiting = documents.some((doc) => isPending(doc.status));
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [waiting, refresh]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/documents", { method: "POST", body });
      const result = await response.json();

      if (!response.ok) {
        // Every rejection already carries a Vietnamese message; showing ours
        // instead would only be less specific.
        setError(result.message ?? "Tải lên thất bại. Vui lòng thử lại.");
        return;
      }

      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
    } catch {
      setError(
        "Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(
          result?.message ?? "Không xoá được tài liệu. Vui lòng thử lại.",
        );
        return;
      }

      setDocuments((current) => current.filter((doc) => doc.id !== id));
      setConfirmingId(null);
    } catch {
      setError("Không kết nối được tới máy chủ. Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <form
        onSubmit={upload}
        className="mt-8 rounded-lg border border-rule bg-panel/60 p-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
            className="min-w-0 flex-1 text-sm text-ink-soft file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-rule file:bg-paper file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-panel"
          />
          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity disabled:opacity-40"
          >
            {uploading ? "Đang xử lý…" : "Tải lên"}
          </button>
        </div>

        {uploading && (
          // Indexing is synchronous, so this request genuinely takes 10-15s.
          // Naming the duration turns an apparent hang into a wait.
          <p
            aria-live="polite"
            className="mt-3 flex items-center gap-2 text-sm text-ink-soft"
          >
            <span
              aria-hidden
              className="size-3 shrink-0 animate-spin rounded-full border-2 border-rule border-t-ink motion-reduce:animate-none"
            />
            Đang tải lên và lập chỉ mục… việc này mất khoảng 10–15 giây.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-lacquer/30 bg-lacquer-soft px-3 py-2 text-sm text-lacquer"
          >
            {error}
          </p>
        )}

        {!uploading && !error && (
          <p className="mt-3 text-sm text-ink-soft">
            Chỉ nhận tệp PDF, tối đa 20 MB.
          </p>
        )}
      </form>

      {documents.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-rule p-10 text-center">
          <p className="font-display text-lg font-medium">
            Chưa có tài liệu nào.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Tải lên thông báo tuyển sinh dạng PDF. Sau khi lập chỉ mục, trợ lý
            sẽ dùng chính văn bản đó để trả lời học sinh.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-rule border-y border-rule">
          {documents.map((doc) => (
            <li key={doc.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="doc-ref mt-1">
                    {doc.file_name} · {formatFileSize(doc.file_size)} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`doc-ref ${STATUS[doc.status].className}`}>
                    {STATUS[doc.status].text}
                  </span>

                  {confirmingId === doc.id ? (
                    // Inline rather than a modal: the teacher's eyes stay on the
                    // row they are about to remove. window.confirm is out --
                    // browsers let users suppress it permanently, which would
                    // silently turn a destructive action into a one-click one.
                    <span className="flex items-center gap-2">
                      <span className="text-sm text-ink-soft">
                        Xoá tài liệu này?
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(doc.id)}
                        disabled={deletingId === doc.id}
                        className="rounded-md bg-lacquer px-2.5 py-1.5 text-sm font-medium text-paper disabled:opacity-40"
                      >
                        {deletingId === doc.id ? "Đang xoá…" : "Xoá"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={deletingId === doc.id}
                        className="rounded-md border border-rule px-2.5 py-1.5 text-sm text-ink-soft"
                      >
                        Huỷ
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(doc.id)}
                      aria-label={`Xoá ${doc.title}`}
                      className="rounded-md border border-rule px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-lacquer hover:text-lacquer"
                    >
                      Xoá
                    </button>
                  )}
                </div>
              </div>

              {doc.status === "failed" && doc.error_message && (
                // On the row, not in a toast: the teacher needs to know which
                // document is unusable, and needs it to still be there later.
                <div className="mt-2 rounded-md border border-lacquer/30 bg-lacquer-soft px-3 py-2">
                  <p className="text-sm leading-relaxed text-lacquer">
                    {doc.error_message}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    Tải lên lại chính tệp này để thử lập chỉ mục lần nữa.
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
