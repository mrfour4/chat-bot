import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { RecoverHandler } from "@/components/auth/recover-handler";
import { safeNextPath } from "@/lib/auth/next-path";
import { PROFILE_PASSWORD_PATH } from "@/lib/profile/paths";

export async function generateMetadata() {
    const t = await getTranslations();
    return {
        title: `${t("auth.forgotPasswordTitle")} · ${t("common.appName")}`,
    };
}

export default async function RecoverPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>;
}) {
    const t = await getTranslations("auth");
    const { next } = await searchParams;

    return (
        <div className="mx-auto w-full max-w-md px-5 py-16 md:py-24">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight text-balance md:text-3xl">
                {t("forgotPasswordTitle")}
            </h1>

            <div className="mt-8">
                <RecoverHandler
                    next={safeNextPath(next ?? PROFILE_PASSWORD_PATH)}
                />
            </div>

            <p className="mt-6 text-center text-sm">
                <Link
                    href="/login"
                    className="text-lacquer underline underline-offset-4"
                >
                    {t("backToSignIn")}
                </Link>
            </p>
        </div>
    );
}
