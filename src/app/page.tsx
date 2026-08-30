import { getTranslations } from "next-intl/server";

import { AskBox, ForbiddenNotice } from "@/components/chat";
import { listIndexedDocuments } from "@/lib/documents";

export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const t = await getTranslations("home");
    const [documents, { error }] = await Promise.all([
        listIndexedDocuments(),
        searchParams,
    ]);

    return (
        <div className="mx-auto max-w-2xl px-5 py-16 md:py-20">
            {error === "forbidden" && <ForbiddenNotice />}

            <section>
                <p className="eyebrow">{t("eyebrow")}</p>
                <h1 className="mt-3 font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl">
                    {t("title")}
                </h1>
                <p className="mt-5 leading-relaxed text-ink-soft">
                    {t("description")}
                </p>
            </section>

            <div className="mt-10">
                <AskBox documentCount={documents.length} />
            </div>
        </div>
    );
}
