import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { DocumentDisplayStatus } from "@/lib/documents/status";

const STYLES: Record<
    DocumentDisplayStatus,
    { key: string; className: string }
> = {
    uploading: { key: "statusUploading", className: "text-pending" },
    indexing: { key: "statusIndexing", className: "text-pending" },
    ready: { key: "statusReady", className: "text-verified" },
    archived: { key: "statusArchived", className: "text-ink-soft" },
    failed: { key: "statusFailed", className: "text-lacquer" },
    deleted: { key: "statusDeleted", className: "text-lacquer" },
};

export function DocumentStatusBadge({
    status,
}: {
    status: DocumentDisplayStatus;
}) {
    const t = useTranslations("documents");
    const { key, className } = STYLES[status];

    return (
        <Badge variant="outline" className={`doc-ref ${className}`}>
            {t(key)}
        </Badge>
    );
}
