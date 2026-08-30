import { useTranslations } from "next-intl";
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
    const t = useTranslations("documents");

    if (document.status !== "failed" || !document.error_message) return null;

    return (
        <Alert variant="destructive" className="mt-2">
            <TriangleAlertIcon />
            <AlertTitle>{t("failureTitle")}</AlertTitle>
            <AlertDescription>
                <p>{document.error_message}</p>

                {document.storage_path ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={retrying}
                        onClick={onRetry}
                    >
                        {retrying && <Spinner />}
                        {retrying ? t("retrying") : t("retry")}
                    </Button>
                ) : (
                    <p className="mt-1 text-ink-soft">{t("reupload")}</p>
                )}
            </AlertDescription>
        </Alert>
    );
}
