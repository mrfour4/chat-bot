import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export async function generateMetadata() {
    const t = await getTranslations();
    return {
        title: `${t("auth.forgotPasswordTitle")} · ${t("common.appName")}`,
    };
}

export default async function ForgotPasswordPage() {
    const t = await getTranslations("auth");

    return (
        <div className="mx-auto w-full max-w-md px-5 py-16 md:py-24">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight text-balance md:text-3xl">
                {t("forgotPasswordTitle")}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {t("forgotPasswordIntro")}
            </p>

            <div className="mt-8">
                <ForgotPasswordForm />
                <p className="mt-6 text-center text-sm">
                    <Link
                        href="/login"
                        className="text-lacquer underline underline-offset-4"
                    >
                        {t("backToSignIn")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
