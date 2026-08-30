import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function AuthSubmit({
    canSubmit,
    submitting,
    children,
}: {
    canSubmit: boolean;
    submitting: boolean;
    children: string;
}) {
    const t = useTranslations("common");

    return (
        <Button type="submit" disabled={!canSubmit} className="w-full">
            {submitting && <Spinner />}
            {submitting ? t("processing") : children}
        </Button>
    );
}
