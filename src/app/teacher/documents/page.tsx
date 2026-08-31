import { getTranslations } from "next-intl/server";

import { requireTeacher } from "@/lib/auth";

import { DocumentsPanel } from "@/components/documents";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("documents.metaTitle")} · ${t("common.appName")}` };
}

export default async function TeacherDocumentsPage() {
    await requireTeacher();
    const t = await getTranslations("documents");

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
            <div className="border-b border-rule pb-6">
                <p className="eyebrow">{t("eyebrow")}</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    {t("title")}
                </h1>
            </div>

            <DocumentsPanel />
        </div>
    );
}
