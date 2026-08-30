import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/db";

const LABELS: Record<DocumentStatus, { text: string; className: string }> = {
    pending: { text: "Chờ lập chỉ mục", className: "text-pending" },
    indexing: { text: "Đang lập chỉ mục", className: "text-pending" },
    ready: { text: "Sẵn sàng", className: "text-verified" },
    failed: { text: "Thất bại", className: "text-lacquer" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
    const { text, className } = LABELS[status];

    return (
        <Badge variant="outline" className={`doc-ref ${className}`}>
            {text}
        </Badge>
    );
}
