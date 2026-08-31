"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UploadRefusal } from "@/lib/validation/upload";

export function UploadButton({
    count,
    uploading,
    refusal,
    reason,
}: {
    count: number;
    uploading: boolean;
    refusal: UploadRefusal | null;
    reason: string | null;
}) {
    const t = useTranslations("documents");

    const button = (
        <Button
            type="submit"
            disabled={Boolean(refusal) || uploading}
            // A disabled button dispatches no pointer events, so the tooltip on
            // the wrapper would never open with the pointer over the button.
            className={refusal ? "pointer-events-none" : undefined}
        >
            {uploading && <Spinner />}
            {uploading ? t("uploading") : t("upload", { count })}
        </Button>
    );

    if (!refusal || !reason) return button;

    return (
        <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
                {button}
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
    );
}
