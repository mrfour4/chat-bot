"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  notice?: string;
}

const CONFIG_ERROR =
  "Không kết nối được máy chủ xác thực. Kiểm tra cấu hình Supabase trong .env.local.";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    fullName: String(formData.get("fullName") ?? "").trim(),
  };
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Nhập email và mật khẩu để đăng nhập." };
  }

  let signInError: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // A missing session with no status is a transport failure, not a wrong password.
    if (error) signInError = error.status ? "Email hoặc mật khẩu không đúng." : CONFIG_ERROR;
  } catch {
    signInError = CONFIG_ERROR;
  }

  if (signInError) return { error: signInError };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, fullName } = readCredentials(formData);
  if (!email || !password) {
    return { error: "Nhập email và mật khẩu để tạo tài khoản." };
  }
  if (password.length < 8) {
    return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || null } },
    });

    if (error) return { error: error.status ? error.message : CONFIG_ERROR };

    // With email confirmation on, Supabase returns a user but no session.
    if (!data.session) {
      return { notice: "Kiểm tra email để xác nhận tài khoản, rồi đăng nhập." };
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
