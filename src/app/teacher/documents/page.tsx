import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listDocuments } from "@/lib/documents/repo";

import { DocumentsPanel } from "./documents-panel";

export const metadata = { title: "Tài liệu · Cố vấn Tuyển sinh" };

export default async function TeacherDocumentsPage() {
    await requireTeacher();
    const supabase = await createClient();

    // Rendered on the server so the list arrives with the HTML and RLS scopes it.
    // The panel takes over from here for anything that changes.
    const documents = await listDocuments(supabase);

    return (
        <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
            <div className="border-b border-rule pb-6">
                <p className="eyebrow">Quản lý tài liệu</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    Tài liệu tuyển sinh
                </h1>
            </div>

            <DocumentsPanel initial={documents} />
        </div>
    );
}
