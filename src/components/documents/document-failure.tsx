import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { DocumentRow } from "@/lib/db";

export function DocumentFailure({
    document,
    retrying,
    onRetry,
}: {
    document: DocumentRow;
    retrying: boolean;
    onRetry: () => void;
}) {
    if (document.status !== "failed" || !document.error_message) return null;

    return (
        <Alert variant="destructive" className="mt-2">
            <TriangleAlertIcon />
            <AlertTitle>Lập chỉ mục thất bại</AlertTitle>
            <AlertDescription>
                <p>{document.error_message}</p>

                {document.storage_path ? (
                    // 2.1.8 said retry *was* re-upload, because we kept no
                    // bytes. 3.3 changed that premise.
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={retrying}
                        onClick={onRetry}
                    >
                        {retrying && <Spinner />}
                        {retrying ? "Đang thử lại…" : "Thử lập chỉ mục lại"}
                    </Button>
                ) : (
                    <p className="mt-1 text-ink-soft">
                        Tải lên lại chính tệp này để thử lập chỉ mục lần nữa.
                    </p>
                )}
            </AlertDescription>
        </Alert>
    );
}
