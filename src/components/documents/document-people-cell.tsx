import { useTranslations } from "next-intl";

import type { DocumentPerson } from "@/lib/documents/repo";

function displayName(person: DocumentPerson | null): string | null {
    if (!person) return null;
    return person.full_name?.trim() || person.email;
}

export function DocumentPeopleCell({
    uploader,
    editor,
}: {
    uploader: DocumentPerson | null;
    editor: DocumentPerson | null;
}) {
    const t = useTranslations("documents");

    const uploadedBy = displayName(uploader);
    const updatedBy = displayName(editor);
    const sameHand = !updatedBy || updatedBy === uploadedBy;

    return (
        <div className="min-w-0">
            <p className="truncate text-sm">{uploadedBy ?? t("unknownUser")}</p>
            {!sameHand && (
                <p className="doc-ref mt-0.5 truncate">
                    {t("editedBy", { name: updatedBy })}
                </p>
            )}
        </div>
    );
}
