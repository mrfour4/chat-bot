import { useTranslations } from "next-intl";
import { LockIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ForbiddenNotice() {
    const t = useTranslations("home");

    return (
        <Alert role="status" className="mb-8 border-pending/40 bg-panel">
            <LockIcon />
            <AlertTitle>{t("forbiddenTitle")}</AlertTitle>
            <AlertDescription>{t("forbiddenDescription")}</AlertDescription>
        </Alert>
    );
}
