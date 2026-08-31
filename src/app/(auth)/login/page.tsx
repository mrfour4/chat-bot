import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GoogleButton, SignInForm, SignUpForm } from "@/components/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSessionUser } from "@/lib/auth";
import { loginErrorKey } from "@/lib/auth/login-error";
import { loginNoticeKey } from "@/lib/auth/login-notice";
import { googleAuthEnabled } from "@/lib/env";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("auth.metaTitle")} · ${t("common.appName")}` };
}

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string; error?: string; notice?: string }>;
}) {
    if (await getSessionUser()) redirect("/");

    const t = await getTranslations("auth");

    const { mode, error, notice } = await searchParams;
    const isSignUp = mode === "signup";
    const errorKey = loginErrorKey(error);
    const noticeKey = loginNoticeKey(notice);
    const oauth = googleAuthEnabled() ? <GoogleButton /> : undefined;

    return (
        <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-[1fr_360px] md:py-24">
            <div className="max-w-md">
                <p className="eyebrow">{t("eyebrow")}</p>
                <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
                    {isSignUp ? t("signUpTitle") : t("signInTitle")}
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                    {t("intro")}
                </p>

                <dl className="mt-8 space-y-3 border-t border-rule pt-6 text-sm">
                    <div className="flex gap-3">
                        <dt className="doc-ref w-20 shrink-0 self-start pt-1">
                            {t("roleGuest")}
                        </dt>
                        <dd className="text-ink-soft">
                            {t("roleGuestDescription")}
                        </dd>
                    </div>
                    <div className="flex gap-3">
                        <dt className="doc-ref w-20 shrink-0 self-start pt-1">
                            {t("roleStudent")}
                        </dt>
                        <dd className="text-ink-soft">
                            {t("roleStudentDescription")}
                        </dd>
                    </div>
                    <div className="flex gap-3">
                        <dt className="doc-ref w-20 shrink-0 self-start pt-1">
                            {t("roleTeacher")}
                        </dt>
                        <dd className="text-ink-soft">
                            {t("roleTeacherDescription")}
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="md:pt-11">
                {noticeKey && (
                    <Alert className="mb-4">
                        <CircleCheckIcon />
                        <AlertDescription>{t(noticeKey)}</AlertDescription>
                    </Alert>
                )}

                {errorKey && (
                    <Alert variant="destructive" className="mb-4">
                        <TriangleAlertIcon />
                        <AlertDescription>{t(errorKey)}</AlertDescription>
                    </Alert>
                )}

                {isSignUp ? (
                    <SignUpForm oauth={oauth} />
                ) : (
                    <SignInForm oauth={oauth} />
                )}
                {!isSignUp && (
                    <p className="mt-4 text-center text-sm">
                        <Link
                            href="/forgot-password"
                            className="text-ink-soft underline underline-offset-4 hover:text-lacquer"
                        >
                            {t("forgotPassword")}
                        </Link>
                    </p>
                )}

                <p className="mt-6 text-center text-sm text-ink-soft">
                    {isSignUp ? t("haveAccount") : t("noAccount")}
                    <Link
                        href={isSignUp ? "/login" : "/login?mode=signup"}
                        className="text-lacquer underline underline-offset-4"
                    >
                        {isSignUp ? t("signIn") : t("signUp")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
