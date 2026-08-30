import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ConversationList } from "@/components/history";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listConversationSummaries } from "@/lib/chat/conversations";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("history.metaTitle")} · ${t("common.appName")}` };
}

export default async function HistoryPage() {
    // Signed-in only. RLS then narrows to this user's own rows, so the page
    // cannot show someone else's conversation even if the guard were wrong.
    await requireUser();
    const t = await getTranslations("history");
    const supabase = await createClient();

    const conversations = await listConversationSummaries(supabase);

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
                    render={<Link href="/">{t("newQuestion")}</Link>}
                />
            </div>

            <ConversationList conversations={conversations} />
        </div>
    );
}
