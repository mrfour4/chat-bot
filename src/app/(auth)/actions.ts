"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/next-path";
import { requestOrigin } from "@/lib/auth/request-origin";
import { createClient } from "@/lib/supabase/server";
import {
    MIN_PASSWORD_LENGTH,
    signInSchema,
    signUpSchema,
    type SignInInput,
    type SignUpInput,
} from "@/lib/validation/auth";

export interface AuthFormState {
    error?: string;
    notice?: string;
}

export async function signIn(input: SignInInput): Promise<AuthFormState> {
    const t = await getTranslations("serverAuth");

    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
        return { error: t("signInFailed") };
    }
    const { email, password } = parsed.data;

    let signInError: string | null = null;
    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error)
            signInError = error.status
                ? t("invalidCredentials")
                : t("configError");
    } catch {
        signInError = t("configError");
    }

    if (signInError) return { error: signInError };

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signUp(input: SignUpInput): Promise<AuthFormState> {
    const t = await getTranslations("serverAuth");
    const tValidation = await getTranslations("validation");

    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
        const key = parsed.error.issues[0]?.message;
        return {
            error: key
                ? tValidation(key, { min: MIN_PASSWORD_LENGTH })
                : t("signUpInvalid"),
        };
    }
    const { email, password, fullName } = parsed.data;

    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName || null } },
        });

        if (error)
            return { error: error.status ? error.message : t("configError") };

        if (!data.session) {
            return { notice: t("confirmEmail") };
        }
    } catch {
        return { error: t("configError") };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signInWithGoogle(next?: string): Promise<AuthFormState> {
    const t = await getTranslations("serverAuth");

    let authorizeUrl: string;

    try {
        const origin = await requestOrigin();
        if (!origin) return { error: t("configError") };

        const callback = new URL("/auth/callback", origin);
        callback.searchParams.set("next", safeNextPath(next));

        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: callback.toString(),
                skipBrowserRedirect: true,
            },
        });

        if (error || !data.url) return { error: t("oauthUnavailable") };

        authorizeUrl = data.url;
    } catch {
        return { error: t("configError") };
    }

    redirect(authorizeUrl);
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/");
}
