import { getTranslations } from "next-intl/server";

import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listDocuments } from "@/lib/documents/repo";

import { DocumentsPanel } from "@/components/documents";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("documents.metaTitle")} · ${t("common.appName")}` };
}

export default async function TeacherDocumentsPage() {
    await requireTeacher();
    const t = await getTranslations("documents");
    const supabase = await createClient();

    // Rendered on the server so the list arrives with the HTML and RLS scopes it.
    // The panel takes over from here for anything that changes.
    const documents = await listDocuments(supabase);

    return (
        <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
            <div className="border-b border-rule pb-6">
                <p className="eyebrow">{t("eyebrow")}</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    {t("title")}
                </h1>
            </div>

            <DocumentsPanel initial={documents} />
        </div>
    );
}
