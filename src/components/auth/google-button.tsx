"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { notifyError } from "@/lib/notify";

export function GoogleButton({ next }: { next?: string }) {
    const t = useTranslations("auth");
    const tCommon = useTranslations("common");
    const [pending, startTransition] = useTransition();

    function start() {
        startTransition(async () => {
            const outcome = await signInWithGoogle(next);
            if (outcome?.error) notifyError(t("failed"), outcome.error);
        });
    }

    return (
        <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={start}
            className="w-full"
        >
            {pending ? <Spinner /> : <GoogleMark />}
            {pending ? tCommon("processing") : t("continueWithGoogle")}
        </Button>
    );
}
