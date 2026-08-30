import { AskBox } from "@/components/chat/ask-box";
import { ForbiddenNotice } from "@/components/chat/forbidden-notice";
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
            {error === "forbidden" && <ForbiddenNotice />}

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
