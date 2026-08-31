"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { parseAuthFragment } from "@/lib/auth/auth-fragment";
import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/client";

async function adoptSession(): Promise<boolean> {
    const fragment = parseAuthFragment(window.location.hash);

    if (!fragment?.accessToken || !fragment.refreshToken) return false;

    const supabase = createClient();
    const { error } = await supabase.auth.setSession({
        access_token: fragment.accessToken,
        refresh_token: fragment.refreshToken,
    });

    return !error;
}

export function RecoverHandler({ next }: { next: string }) {
    const t = useTranslations("auth");
    const router = useRouter();
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        void adoptSession().then((adopted) => {
            if (cancelled) return;

            if (!adopted) {
                setFailed(true);
                return;
            }

            window.history.replaceState(null, "", window.location.pathname);
            router.replace(safeNextPath(next));
        });

        return () => {
            cancelled = true;
        };
    }, [next, router]);

    if (failed) {
        return (
            <Alert variant="destructive">
                <AlertDescription>{t("errorConfirm")}</AlertDescription>
            </Alert>
        );
    }

    return (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Spinner />
            {t("verifying")}
        </p>
    );
}
