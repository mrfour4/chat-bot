import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GoogleMark } from "@/components/auth/google-mark";
import { AvatarForm } from "@/components/profile/avatar-form";
import { ConnectionRow } from "@/components/profile/connection-row";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { DisplayNameForm } from "@/components/profile/display-name-form";
import { ProfileSection } from "@/components/profile/profile-section";
import { SetPasswordForm } from "@/components/profile/set-password-form";
import { requireUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/profile/avatar-url";
import { getIdentities } from "@/lib/profile/connections";
import { describeConnections, hasPassword } from "@/lib/profile/identities";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("profile.metaTitle")} · ${t("common.appName")}` };
}

export default async function ProfilePage() {
    const user = await requireUser();
    const t = await getTranslations("profile");

    const [src, identities] = await Promise.all([
        avatarUrl(user),
        getIdentities(),
    ]);

    const stored = Boolean(user.profile.avatar_url);
    const passwordSet = hasPassword(identities);
    const connections = describeConnections(identities);

    return (
        <div className="mx-auto w-full max-w-3xl px-5 py-12 md:py-16">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight text-balance md:text-3xl">
                {t("title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
                {t("intro")}
            </p>

            <div className="mt-10 flex flex-col gap-6">
                <ProfileSection title={t("avatar")}>
                    <AvatarForm
                        src={src}
                        fullName={user.profile.full_name}
                        email={user.email}
                        stored={stored}
                        usingGooglePicture={!stored && Boolean(src)}
                    />
                </ProfileSection>

                <ProfileSection title={t("identity")}>
                    <div className="flex flex-col gap-6">
                        <DisplayNameForm fullName={user.profile.full_name} />

                        <dl className="grid gap-4 border-t border-rule pt-5 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="doc-ref">{t("email")}</dt>
                                <dd className="mt-1 truncate text-ink">
                                    {user.email}
                                </dd>
                                <dd className="mt-1 text-xs text-ink-soft">
                                    {t("emailHelp")}
                                </dd>
                            </div>
                            <div>
                                <dt className="doc-ref">{t("role")}</dt>
                                <dd className="mt-1 text-ink">
                                    {user.profile.role === "teacher"
                                        ? t("roleTeacher")
                                        : t("roleStudent")}
                                </dd>
                                <dd className="mt-1 text-xs text-ink-soft">
                                    {t("roleHelp")}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </ProfileSection>

                <ProfileSection
                    title={t("password")}
                    description={passwordSet ? undefined : t("noPasswordYet")}
                >
                    {passwordSet ? <ChangePasswordForm /> : <SetPasswordForm />}

                    {passwordSet && (
                        <p className="mt-4 text-sm">
                            <Link
                                href="/forgot-password"
                                className="text-ink-soft underline underline-offset-4 hover:text-lacquer"
                            >
                                {t("forgotPasswordHint")}
                            </Link>
                        </p>
                    )}
                </ProfileSection>

                <ProfileSection
                    title={t("connections")}
                    description={t("connectionsHelp")}
                >
                    <div className="divide-y divide-rule">
                        <ConnectionRow
                            label={t("google")}
                            mark={<GoogleMark />}
                            connection={connections.google}
                        />
                    </div>
                </ProfileSection>
            </div>
        </div>
    );
}
