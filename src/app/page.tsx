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

    const intro = (
        <div className="pt-4 pb-2 md:pt-8">
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
        </div>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <AskBox documentCount={documents.length} intro={intro} />
        </div>
    );
}
