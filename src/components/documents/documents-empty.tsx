import { useTranslations } from "next-intl";
import { FileTextIcon, SearchXIcon } from "lucide-react";

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function DocumentsEmpty({ filtered }: { filtered: boolean }) {
    const t = useTranslations("documents");

    return (
        <Empty className="border-0">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    {filtered ? <SearchXIcon /> : <FileTextIcon />}
                </EmptyMedia>
                <EmptyTitle>
                    {filtered ? t("noMatchesTitle") : t("emptyTitle")}
                </EmptyTitle>
                <EmptyDescription>
                    {filtered
                        ? t("noMatchesDescription")
                        : t("emptyDescription")}
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
