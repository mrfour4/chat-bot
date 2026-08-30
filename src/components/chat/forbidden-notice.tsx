import { useTranslations } from "next-intl";
import { LockIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * `requireTeacher()` redirects here when a student opens a teacher link.
 * Without this the bounce is silent, and the student is left thinking the page
 * is broken rather than not theirs.
 */
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
