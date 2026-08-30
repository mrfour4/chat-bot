import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/db";

const LABELS: Record<DocumentStatus, { key: string; className: string }> = {
    pending: { key: "statusPending", className: "text-pending" },
    indexing: { key: "statusIndexing", className: "text-pending" },
    ready: { key: "statusReady", className: "text-verified" },
    failed: { key: "statusFailed", className: "text-lacquer" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
    const t = useTranslations("documents");
    const { key, className } = LABELS[status];

    return (
        <Badge variant="outline" className={`doc-ref ${className}`}>
            {t(key)}
        </Badge>
    );
}
