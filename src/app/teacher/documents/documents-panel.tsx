"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { DocumentRow } from "@/lib/db";
import { formatFileSize } from "@/lib/documents/format";
import { isPending, isStale } from "@/lib/documents/status";
import { queryKeys } from "@/lib/query/keys";

const STATUS: Record<
    DocumentRow["status"],
    { text: string; className: string }
> = {
    pending: { text: "Chờ lập chỉ mục", className: "text-pending" },
    indexing: { text: "Đang lập chỉ mục", className: "text-pending" },
    ready: { text: "Sẵn sàng", className: "text-verified" },
    failed: { text: "Thất bại", className: "text-lacquer" },
};

const POLL_INTERVAL_MS = 3000;

/** Reads the API's Vietnamese message, rather than restating it less usefully. */
async function messageFrom(response: Response, fallback: string) {
    const body = await response.json().catch(() => null);
    return body?.message ?? fallback;
}

async function fetchDocuments(): Promise<DocumentRow[]> {
    const response = await fetch("/api/documents");
    if (!response.ok) {
        throw new Error(
            await messageFrom(response, "Không tải được danh sách."),
        );
    }
    const body: { documents: DocumentRow[] } = await response.json();
    return body.documents;
}

export function DocumentsPanel({ initial }: { initial: DocumentRow[] }) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: documents = [] } = useQuery({
        queryKey: queryKeys.documents,
        queryFn: fetchDocuments,
        // Keeps the server-rendered first paint; without it the list would blank
        // on hydration and fill in a moment later.
        initialData: initial,
        // Polls only while something is genuinely in flight, then stops. With
        // synchronous indexing this is usually redundant -- it covers a request
        // interrupted after the row was created, which would otherwise leave the
        // list permanently stale.
        refetchInterval: (query) =>
            (query.state.data ?? []).some((doc) => isPending(doc.status))
                ? POLL_INTERVAL_MS
                : false,
    });

    const upload = useMutation({
        mutationFn: async (selected: File) => {
            const body = new FormData();
            body.append("file", selected);

            const response = await fetch("/api/documents", {
                method: "POST",
                body,
            });
            if (!response.ok) {
                throw new Error(
                    await messageFrom(
                        response,
                        "Tải lên thất bại. Vui lòng thử lại.",
                    ),
                );
            }
            return (await response.json()) as DocumentRow;
        },
        onSuccess: () => {
            setFile(null);
            if (inputRef.current) inputRef.current.value = "";
            return queryClient.invalidateQueries({
                queryKey: queryKeys.documents,
            });
        },
    });

    const remove = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/documents/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error(
                    await messageFrom(response, "Không xoá được tài liệu."),
                );
            }
        },
        onSuccess: () => {
            setConfirmingId(null);
            return queryClient.invalidateQueries({
                queryKey: queryKeys.documents,
            });
        },
    });

    const retry = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/documents/${id}/retry`, {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error(
                    await messageFrom(
                        response,
                        "Không thử lại được. Vui lòng thử lại.",
                    ),
                );
            }
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
    });

    /**
     * Nudges the sweeper when something has been in flight too long.
     *
     * `after()` is a promise on a process that may not survive, so a crashed
     * worker would leave a row at "Đang lập chỉ mục" forever -- work in progress
     * that is not in progress. This turns that into a delay, and it costs no
     * scheduling infrastructure: the page that shows the stuck row is the one
     * that asks for it to be re-driven.
     */
    useEffect(() => {
        if (!documents.some((doc) => isStale(doc))) return;

        fetch("/api/documents/reindex", { method: "POST" })
            .then(() =>
                queryClient.invalidateQueries({
                    queryKey: queryKeys.documents,
                }),
            )
            .catch(() => {
                // A failed nudge is not worth showing: the row already says what state
                // it is in, and the next poll will try again.
            });
    }, [documents, queryClient]);

    const error = upload.error ?? remove.error ?? retry.error;

    return (
        <>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (file) upload.mutate(file);
                }}
                className="mt-8 rounded-lg border border-rule bg-panel/60 p-5"
            >
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={upload.isPending}
                        onChange={(event) => {
                            setFile(event.target.files?.[0] ?? null);
                            upload.reset();
                        }}
                        className="min-w-0 flex-1 text-sm text-ink-soft file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-rule file:bg-paper file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-panel"
                    />
                    <button
                        type="submit"
                        disabled={!file || upload.isPending}
                        className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity disabled:opacity-40"
                    >
                        {upload.isPending ? "Đang xử lý…" : "Tải lên"}
                    </button>
                </div>

                {upload.isPending && (
                    // Only the upload now. Indexing is queued when this returns, so the
                    // wait is however long the file takes to travel -- not 10-15s of
                    // Gemini work the teacher used to have to sit through.
                    <p
                        aria-live="polite"
                        className="mt-3 flex items-center gap-2 text-sm text-ink-soft"
                    >
                        <span
                            aria-hidden
                            className="size-3 shrink-0 animate-spin rounded-full border-2 border-rule border-t-ink motion-reduce:animate-none"
                        />
                        Đang tải tệp lên…
                    </p>
                )}

                {error && (
                    <p
                        role="alert"
                        className="mt-3 rounded-md border border-lacquer/30 bg-lacquer-soft px-3 py-2 text-sm text-lacquer"
                    >
                        {error.message}
                    </p>
                )}

                {!upload.isPending && !error && (
                    <p className="mt-3 text-sm text-ink-soft">
                        Chỉ nhận tệp PDF, tối đa 20 MB. Sau khi tải lên xong,
                        việc lập chỉ mục chạy nền — bạn có thể rời khỏi trang
                        hoặc đóng trình duyệt.
                    </p>
                )}
            </form>

            {documents.length === 0 ? (
                <div className="mt-10 rounded-lg border border-dashed border-rule p-10 text-center">
                    <p className="font-display text-lg font-medium">
                        Chưa có tài liệu nào.
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
                        Tải lên thông báo tuyển sinh dạng PDF. Sau khi lập chỉ
                        mục, trợ lý sẽ dùng chính văn bản đó để trả lời học
                        sinh.
                    </p>
                </div>
            ) : (
                <ul className="mt-8 divide-y divide-rule border-y border-rule">
                    {documents.map((doc) => (
                        <li key={doc.id} className="py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    {doc.storage_path ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPreviewingId(
                                                    previewingId === doc.id
                                                        ? null
                                                        : doc.id,
                                                )
                                            }
                                            aria-expanded={
                                                previewingId === doc.id
                                            }
                                            className="block max-w-full truncate text-left text-sm font-medium underline decoration-rule underline-offset-4 transition-colors hover:decoration-ink"
                                        >
                                            {doc.title}
                                        </button>
                                    ) : (
                                        // Uploaded before 3.3, so there is no file to open. Plain
                                        // text rather than a control that would do nothing.
                                        <p className="truncate text-sm font-medium">
                                            {doc.title}
                                        </p>
                                    )}
                                    <p className="doc-ref mt-1">
                                        {doc.file_name} ·{" "}
                                        {formatFileSize(doc.file_size)} ·{" "}
                                        {new Date(
                                            doc.created_at,
                                        ).toLocaleDateString("vi-VN")}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-3">
                                    <span
                                        className={`doc-ref ${STATUS[doc.status].className}`}
                                    >
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
                                                onClick={() =>
                                                    remove.mutate(doc.id)
                                                }
                                                disabled={remove.isPending}
                                                className="rounded-md bg-lacquer px-2.5 py-1.5 text-sm font-medium text-paper disabled:opacity-40"
                                            >
                                                {remove.isPending
                                                    ? "Đang xoá…"
                                                    : "Xoá"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingId(null)
                                                }
                                                disabled={remove.isPending}
                                                className="rounded-md border border-rule px-2.5 py-1.5 text-sm text-ink-soft"
                                            >
                                                Huỷ
                                            </button>
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                remove.reset();
                                                setConfirmingId(doc.id);
                                            }}
                                            aria-label={`Xoá ${doc.title}`}
                                            className="rounded-md border border-rule px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-lacquer hover:text-lacquer"
                                        >
                                            Xoá
                                        </button>
                                    )}
                                </div>
                            </div>

                            {previewingId === doc.id && doc.storage_path && (
                                // Inline rather than a modal, for the same reason the delete
                                // confirmation is inline: the teacher's eyes stay on the row.
                                // It also avoids a dialog's focus trap and escape handling for
                                // something that is really just a longer row.
                                <div className="mt-4">
                                    <div className="flex flex-wrap items-center gap-3 pb-3">
                                        <a
                                            href={`/api/documents/${doc.id}/file?download=1`}
                                            className="rounded-md border border-rule px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-ink"
                                        >
                                            Tải xuống
                                        </a>
                                        {/* Always offered, not only as an error path: iOS Safari
                        and some Android browsers refuse to render a PDF inside
                        an iframe, and there is no reliable way to detect that
                        before it fails. A visible link degrades to working
                        rather than to a blank rectangle. */}
                                        <a
                                            href={`/api/documents/${doc.id}/file`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
                                        >
                                            Mở trong tab mới
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPreviewingId(null)
                                            }
                                            className="ml-auto text-sm text-ink-soft hover:text-ink"
                                        >
                                            Đóng
                                        </button>
                                    </div>

                                    <iframe
                                        src={`/api/documents/${doc.id}/file`}
                                        title={`Xem trước ${doc.title}`}
                                        className="h-[70vh] max-h-[720px] w-full rounded-md border border-rule bg-panel"
                                    />
                                </div>
                            )}

                            {doc.status === "failed" && doc.error_message && (
                                <div className="mt-2 rounded-md border border-lacquer/30 bg-lacquer-soft px-3 py-2">
                                    <p className="text-sm leading-relaxed text-lacquer">
                                        {doc.error_message}
                                    </p>
                                    {doc.storage_path ? (
                                        // 2.1.8 said retry *was* re-upload, because we kept no
                                        // bytes. 3.3 changed that premise.
                                        <button
                                            type="button"
                                            onClick={() => retry.mutate(doc.id)}
                                            disabled={retry.isPending}
                                            className="mt-2 rounded-md border border-lacquer/40 bg-paper px-2.5 py-1.5 text-sm font-medium text-lacquer transition-colors hover:border-lacquer disabled:opacity-40"
                                        >
                                            {retry.isPending
                                                ? "Đang thử lại…"
                                                : "Thử lập chỉ mục lại"}
                                        </button>
                                    ) : (
                                        <p className="mt-1.5 text-sm text-ink-soft">
                                            Tải lên lại chính tệp này để thử lập
                                            chỉ mục lần nữa.
                                        </p>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
