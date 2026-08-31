import { useTranslations } from "next-intl";
import { SearchXIcon } from "lucide-react";

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function HistoryNoMatches() {
    const t = useTranslations("history");

    return (
        <Empty className="mt-10 border border-dashed border-rule">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>{t("noMatchesTitle")}</EmptyTitle>
                <EmptyDescription>{t("noMatchesDescription")}</EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
