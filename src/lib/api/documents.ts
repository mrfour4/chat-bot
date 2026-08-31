import type { DocumentRow } from "@/lib/db";
import { expectOk } from "@/lib/api/http";
import type { DocumentListing } from "@/lib/documents/repo";

export type DocumentsQuery = {
    search: string;
    status: string;
    page: number;
    pageSize: number;
};

export type DocumentsPage = DocumentListing & {
    page: number;
    pageSize: number;
};

export async function fetchDocumentsPage(
    query: DocumentsQuery,
): Promise<DocumentsPage> {
    const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
    });
    if (query.search) params.set("q", query.search);
    if (query.status !== "all") params.set("status", query.status);

    const response = await expectOk(
        await fetch(`/api/documents?${params}`),
        "Không tải được danh sách.",
    );
    return (await response.json()) as DocumentsPage;
}

export async function uploadDocument(file: File): Promise<DocumentRow> {
    const body = new FormData();
    body.append("file", file);

    const response = await expectOk(
        await fetch("/api/documents", { method: "POST", body }),
        "Tải lên thất bại. Vui lòng thử lại.",
    );
    return (await response.json()) as DocumentRow;
}

export async function deleteDocument(id: string): Promise<void> {
    await expectOk(
        await fetch(`/api/documents/${id}`, { method: "DELETE" }),
        "Không xoá được tài liệu.",
    );
}

export async function renameDocument(input: {
    id: string;
    title: string;
}): Promise<DocumentRow> {
    const response = await expectOk(
        await fetch(`/api/documents/${input.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: input.title }),
        }),
        "Không đổi được tên tài liệu.",
    );
    return (await response.json()) as DocumentRow;
}

export async function archiveDocument(id: string): Promise<void> {
    await expectOk(
        await fetch(`/api/documents/${id}/archive`, { method: "POST" }),
        "Không lưu trữ được tài liệu.",
    );
}

export async function unarchiveDocument(id: string): Promise<void> {
    await expectOk(
        await fetch(`/api/documents/${id}/archive`, { method: "DELETE" }),
        "Không khôi phục được tài liệu.",
    );
}

export async function retryDocument(id: string): Promise<void> {
    await expectOk(
        await fetch(`/api/documents/${id}/retry`, { method: "POST" }),
        "Không thử lại được. Vui lòng thử lại.",
    );
}

export async function requestReindex(): Promise<void> {
    await fetch("/api/documents/reindex", { method: "POST" });
}
