import type { DocumentRow } from "@/lib/db";
import { expectOk } from "@/lib/api/http";

export async function fetchDocuments(): Promise<DocumentRow[]> {
    const response = await expectOk(
        await fetch("/api/documents"),
        "Không tải được danh sách.",
    );
    const body: { documents: DocumentRow[] } = await response.json();
    return body.documents;
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

export async function retryDocument(id: string): Promise<void> {
    await expectOk(
        await fetch(`/api/documents/${id}/retry`, { method: "POST" }),
        "Không thử lại được. Vui lòng thử lại.",
    );
}

export async function requestReindex(): Promise<void> {
    await fetch("/api/documents/reindex", { method: "POST" });
}
