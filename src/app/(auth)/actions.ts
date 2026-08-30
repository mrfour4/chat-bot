"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
    signInSchema,
    signUpSchema,
    type SignInInput,
    type SignUpInput,
} from "@/lib/validation/auth";

export interface AuthFormState {
    error?: string;
    notice?: string;
}

const CONFIG_ERROR =
    "Không kết nối được máy chủ xác thực. Kiểm tra cấu hình Supabase trong .env.local.";

export async function signIn(input: SignInInput): Promise<AuthFormState> {
    // Re-validated here, not trusted from the client. The form runs the same
    // schema for immediate feedback; this run is the one that decides.
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
        return { error: "Nhập email và mật khẩu để đăng nhập." };
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
                ? "Email hoặc mật khẩu không đúng."
                : CONFIG_ERROR;
    } catch {
        signInError = CONFIG_ERROR;
    }

    if (signInError) return { error: signInError };

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signUp(input: SignUpInput): Promise<AuthFormState> {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
        return {
            error:
                parsed.error.issues[0]?.message ??
                "Thông tin đăng ký chưa hợp lệ.",
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
            return { error: error.status ? error.message : CONFIG_ERROR };

        // With email confirmation on, Supabase returns a user but no session.
        if (!data.session) {
            return {
                notice: "Kiểm tra email để xác nhận tài khoản, rồi đăng nhập.",
            };
        }
    } catch {
        return { error: CONFIG_ERROR };
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
