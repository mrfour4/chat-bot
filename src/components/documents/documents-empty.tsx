import { useTranslations } from "next-intl";
import { FileTextIcon } from "lucide-react";

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function DocumentsEmpty() {
    const t = useTranslations("documents");

    return (
        <Empty className="mt-10 border border-dashed border-rule">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileTextIcon />
                </EmptyMedia>
                <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
