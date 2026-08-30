"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, signUp, type AuthFormState } from "@/app/(auth)/actions";

const EMPTY: AuthFormState = {};

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
    const isSignUp = mode === "signup";
    const [state, formAction] = useActionState(
        isSignUp ? signUp : signIn,
        EMPTY,
    );

    return (
        <form
            action={formAction}
            className="space-y-4 rounded-lg border border-rule bg-white p-6"
        >
            {isSignUp && (
                <Field
                    label="Họ và tên"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                />
            )}
            <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
            />
            <Field
                label="Mật khẩu"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                hint={isSignUp ? "Ít nhất 8 ký tự." : undefined}
                required
            />

            {state.error && (
                <p
                    role="alert"
                    className="border-l-2 border-lacquer bg-lacquer-soft px-3 py-2 text-sm"
                >
                    {state.error}
                </p>
            )}
            {state.notice && (
                <p
                    role="status"
                    className="border-l-2 border-verified bg-panel px-3 py-2 text-sm"
                >
                    {state.notice}
                </p>
            )}

            <Submit>{isSignUp ? "Tạo tài khoản" : "Đăng nhập"}</Submit>
        </form>
    );
}

function Field({
    label,
    hint,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
}) {
    return (
        <label className="block">
            <span className="doc-ref">{label}</span>
            <input
                {...props}
                className="mt-1.5 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm transition-colors placeholder:text-ink-soft focus:border-ink focus:outline-none"
            />
            {hint && (
                <span className="mt-1 block text-xs text-ink-soft">{hint}</span>
            )}
        </label>
    );
}

function Submit({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
            {pending ? "Đang xử lý…" : children}
        </button>
    );
}
