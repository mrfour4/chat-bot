import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageSquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function HistoryEmpty() {
    const t = useTranslations("history");

    return (
        <Empty className="mt-10 border border-dashed border-rule">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <MessageSquareIcon />
                </EmptyMedia>
                <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button
                    nativeButton={false}
                    render={<Link href="/">{t("emptyAction")}</Link>}
                />
            </EmptyContent>
        </Empty>
    );
}
