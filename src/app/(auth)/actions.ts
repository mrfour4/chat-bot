"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

    // Re-validated here, not trusted from the client. The form runs the same
    // schema for immediate feedback; this run is the one that decides.
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
        // A missing session with no status is a transport failure, not a wrong password.
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
        // The schema speaks in keys, so translate the first one here rather
        // than handing a raw identifier to the browser.
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

        // With email confirmation on, Supabase returns a user but no session.
        if (!data.session) {
            return { notice: t("confirmEmail") };
        }
    } catch {
        return { error: t("configError") };
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/");
}
