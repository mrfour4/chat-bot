"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { authErrorKind } from "@/lib/auth/auth-error";
import { requestOrigin } from "@/lib/auth/request-origin";
import { PROFILE_PASSWORD_PATH, PROFILE_PATH } from "@/lib/profile/paths";
import { createClient } from "@/lib/supabase/server";
import {
    changePasswordSchema,
    forgotPasswordSchema,
    setPasswordSchema,
} from "@/lib/validation/profile";
import type { ProfileFormState } from "@/app/profile/actions";

export async function changePassword(
    input: unknown,
): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");

    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
        const key = parsed.error.issues[0]?.message;
        return {
            error:
                key === "passwordUnchanged"
                    ? t("passwordUnchanged")
                    : t("passwordInvalid"),
        };
    }

    const user = await requireUser();
    const supabase = await createClient();

    const { error: wrongPassword } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: parsed.data.currentPassword,
    });

    if (wrongPassword) return { error: t("currentPasswordWrong") };

    const { error } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
    });

    if (error) return { error: t("passwordRejected") };

    return { notice: t("passwordChanged") };
}

export async function setPassword(input: unknown): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");

    const parsed = setPasswordSchema.safeParse(input);
    if (!parsed.success) return { error: t("passwordInvalid") };

    await requireUser();
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
        password: parsed.data.newPassword,
    });

    if (error) return { error: t("passwordRejected") };

    revalidatePath(PROFILE_PATH);
    revalidatePath("/", "layout");
    return { notice: t("passwordSet") };
}

export async function sendPasswordReset(
    input: unknown,
): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");

    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) return { error: t("emailInvalid") };

    const origin = await requestOrigin();
    if (!origin) return { error: t("saveFailed") };

    const supabase = await createClient();

    const landing = new URL("/auth/callback", origin);
    landing.searchParams.set("next", PROFILE_PASSWORD_PATH);
    landing.searchParams.set("flow", "recovery");

    const { error } = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        { redirectTo: landing.toString() },
    );

    const kind = authErrorKind(error);

    if (kind === "rate-limited") return { error: t("resetRateLimited") };
    if (kind !== "none") return { error: t("resetFailed") };

    return { notice: t("resetEmailSent") };
}
