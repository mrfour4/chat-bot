import { useTranslations } from "next-intl";
import { LibraryIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EmptyLibraryNotice() {
    const t = useTranslations("chat");

    return (
        <Alert role="status" className="mb-6 border-pending/40 bg-panel">
            <LibraryIcon />
            <AlertTitle>{t("emptyLibraryTitle")}</AlertTitle>
            <AlertDescription>{t("emptyLibraryDescription")}</AlertDescription>
        </Alert>
    );
}
