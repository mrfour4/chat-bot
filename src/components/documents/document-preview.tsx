import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import type { DocumentRow } from "@/lib/db";
import { cn } from "@/lib/utils";

export function DocumentPreview({
    document,
    onClose,
}: {
    document: DocumentRow;
    onClose: () => void;
}) {
    const t = useTranslations("documents");
    const tc = useTranslations("common");
    const href = `/api/documents/${document.id}/file`;

    return (
        <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3 pb-3">
                <a
                    href={`${href}?download=1`}
                    className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                    })}
                >
                    {t("download")}
                </a>
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        buttonVariants({ variant: "link", size: "sm" }),
                        "text-ink-soft",
                    )}
                >
                    {t("openInNewTab")}
                </a>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="ml-auto text-ink-soft"
                >
                    {tc("close")}
                </Button>
            </div>

            <iframe
                src={href}
                title={t("previewTitle", { title: document.title })}
                className="h-[70vh] max-h-[720px] w-full rounded-md border border-rule bg-panel"
            />
        </div>
    );
}
