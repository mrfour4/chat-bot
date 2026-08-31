import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HistoryPanel } from "@/components/history";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("history.metaTitle")} · ${t("common.appName")}` };
}

export default async function HistoryPage() {
    await requireUser();
    const t = await getTranslations("history");

    return (
        <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
            <div className="flex items-end justify-between gap-4 border-b border-rule pb-6">
                <div>
                    <p className="eyebrow">{t("eyebrow")}</p>
                    <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                        {t("title")}
                    </h1>
                </div>
                <Button
                    className="shrink-0"
                    nativeButton={false}
                    render={<Link href="/">{t("newQuestion")}</Link>}
                />
            </div>

            <HistoryPanel />
        </div>
    );
}
