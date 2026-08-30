import Link from "next/link";

import { ConversationList } from "@/components/history";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listConversationSummaries } from "@/lib/chat/conversations";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lịch sử · Cố vấn Tuyển sinh" };

export default async function HistoryPage() {
    // Signed-in only. RLS then narrows to this user's own rows, so the page
    // cannot show someone else's conversation even if the guard were wrong.
    await requireUser();
    const supabase = await createClient();

    const conversations = await listConversationSummaries(supabase);

    return (
        <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
            <div className="flex items-end justify-between gap-4 border-b border-rule pb-6">
                <div>
                    <p className="eyebrow">Của bạn</p>
                    <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                        Lịch sử hỏi đáp
                    </h1>
                </div>
                <Button
                    className="shrink-0"
                    render={<Link href="/">Đặt câu hỏi mới</Link>}
                />
            </div>

            <ConversationList conversations={conversations} />
        </div>
    );
}
