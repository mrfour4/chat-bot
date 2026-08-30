import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/lib/db";

export const metadata = { title: "Tài liệu · Cố vấn Tuyển sinh" };

const STATUS_LABEL: Record<DocumentRow["status"], { text: string; className: string }> = {
  pending: { text: "Chờ xử lý", className: "text-pending" },
  indexing: { text: "Đang lập chỉ mục", className: "text-pending" },
  ready: { text: "Sẵn sàng", className: "text-verified" },
  failed: { text: "Thất bại", className: "text-lacquer" },
};

export default async function TeacherDocumentsPage() {
  const user = await requireTeacher();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p className="eyebrow">Quản lý tài liệu</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Tài liệu tuyển sinh
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Đăng nhập với tư cách giáo viên · {user.email}
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Chức năng tải lên sẽ có ở bước tiếp theo"
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
        >
          Tải lên PDF
        </button>
      </div>

      {!documents || documents.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-rule p-10 text-center">
          <p className="font-display text-lg font-medium">Chưa có tài liệu nào.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Tải lên thông báo tuyển sinh dạng PDF (3–5 trang). Sau khi lập chỉ
            mục, trợ lý sẽ dùng chính văn bản đó để trả lời học sinh.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-rule border-y border-rule">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="doc-ref mt-1">
                  {doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB ·{" "}
                  {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <span className={`doc-ref ${STATUS_LABEL[doc.status].className}`}>
                {STATUS_LABEL[doc.status].text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
