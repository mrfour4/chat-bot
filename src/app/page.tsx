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
        <div className="mx-auto max-w-2xl px-5 py-16 md:py-20">
            {/* requireTeacher() redirects here when a student opens a teacher link.
          Without this the bounce is silent, and the student is left thinking
          the page is broken rather than not theirs. */}
            {error === "forbidden" && (
                <p
                    role="status"
                    className="mb-8 rounded-md border border-pending/40 bg-panel px-4 py-3 text-sm leading-relaxed"
                >
                    Trang quản lý tài liệu chỉ dành cho giáo viên. Bạn vẫn có
                    thể đặt câu hỏi về tuyển sinh ở ngay bên dưới.
                </p>
            )}

            <section>
                <p className="eyebrow">Hỏi đáp tuyển sinh</p>
                <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
                    Mọi câu trả lời đều trích từ văn bản tuyển sinh chính thức.
                </h1>
                <p className="mt-5 leading-relaxed text-ink-soft">
                    Hỏi về phương thức xét tuyển, chỉ tiêu, học phí, hồ sơ hay
                    mốc thời gian. Nếu tài liệu hiện có không nói đến điều bạn
                    hỏi, trợ lý sẽ nói rõ là chưa có thông tin — không suy đoán.
                </p>
            </section>

            <div className="mt-10">
                <AskBox documentCount={documents.length} />
            </div>
        </div>
    );
}
