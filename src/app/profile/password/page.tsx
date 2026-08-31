import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { completePasswordReset } from "@/app/profile/password-actions";
import { SetPasswordForm } from "@/components/profile/set-password-form";
import { requireUser } from "@/lib/auth";

export async function generateMetadata() {
    const t = await getTranslations();
    return {
        title: `${t("profile.newPasswordTitle")} · ${t("common.appName")}`,
    };
}

export default async function NewPasswordPage() {
    await requireUser();
    const t = await getTranslations("profile");

    return (
        <div className="mx-auto w-full max-w-md px-5 py-16 md:py-24">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight text-balance md:text-3xl">
                {t("newPasswordTitle")}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {t("newPasswordIntro")}
            </p>

            <div className="mt-8 rounded-lg border border-rule bg-surface p-6">
                <SetPasswordForm action={completePasswordReset} />
            </div>

            <p className="mt-6 text-center text-sm">
                <Link
                    href="/profile"
                    className="text-lacquer underline underline-offset-4"
                >
                    {t("backToProfile")}
                </Link>
            </p>
        </div>
    );
}
