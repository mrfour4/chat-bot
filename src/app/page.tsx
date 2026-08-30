import { AskBox } from "@/components/ask-box";
import { listIndexedDocuments } from "@/lib/documents";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [documents, { error }] = await Promise.all([
    listIndexedDocuments(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 md:py-24">
      {/* requireTeacher() redirects here when a student opens a teacher link.
          Without this the bounce is silent, and the student is left thinking
          the page is broken rather than not theirs. */}
      {error === "forbidden" && (
        <p
          role="status"
          className="mb-8 rounded-md border border-pending/40 bg-panel px-4 py-3 text-sm leading-relaxed"
        >
          Trang quản lý tài liệu chỉ dành cho giáo viên. Bạn vẫn có thể đặt câu
          hỏi về tuyển sinh ở ngay bên dưới.
        </p>
      )}

      <section className="max-w-2xl">
        <p className="eyebrow">Hỏi đáp tuyển sinh</p>
        <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
          Mọi câu trả lời đều trích từ văn bản tuyển sinh chính thức.
        </h1>
        <p className="mt-5 max-w-xl leading-relaxed text-ink-soft">
          Hỏi về phương thức xét tuyển, chỉ tiêu, học phí, hồ sơ hay mốc thời
          gian. Nếu tài liệu hiện có không nói đến điều bạn hỏi, trợ lý sẽ nói
          rõ là chưa có thông tin — không suy đoán.
        </p>
      </section>

      <div className="mt-10 max-w-2xl">
        <AskBox />
      </div>

      <section className="mt-20 border-t border-rule pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="eyebrow">Tài liệu đang dùng</h2>
          <span className="doc-ref">{documents.length} văn bản</span>
        </div>

        {documents.length === 0 ? (
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">
            Chưa có tài liệu nào được lập chỉ mục. Giáo viên cần tải lên thông
            báo tuyển sinh trước khi trợ lý có thể trả lời.
          </p>
        ) : (
          <ul className="mt-5 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2">
            {documents.map((doc, index) => (
              <li key={doc.id} className="bg-paper p-4">
                <span className="doc-ref text-lacquer">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-1.5 text-sm leading-snug font-medium">{doc.title}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
