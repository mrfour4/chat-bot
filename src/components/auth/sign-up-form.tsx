"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { signUp, type AuthFormState } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthResult } from "@/components/auth/auth-result";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FieldGroup } from "@/components/ui/field";
import { MIN_PASSWORD_LENGTH, signUpSchema } from "@/lib/validation/auth";

export function SignUpForm() {
    const [result, setResult] = useState<AuthFormState>({});

    const form = useForm({
        defaultValues: { fullName: "", email: "", password: "" },
        validators: { onChange: signUpSchema },
        onSubmit: async ({ value }) => {
            setResult({});
            setResult(await signUp(value));
        },
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
            className="rounded-lg border border-rule bg-white p-6"
        >
            <FieldGroup>
                <form.Field name="fullName">
                    {(field) => (
                        <AuthField
                            field={field}
                            label="Họ và tên"
                            type="text"
                            autoComplete="name"
                        />
                    )}
                </form.Field>

                <form.Field name="email">
                    {(field) => (
                        <AuthField
                            field={field}
                            label="Email"
                            type="email"
                            autoComplete="email"
                        />
                    )}
                </form.Field>

                <form.Field name="password">
                    {(field) => (
                        <AuthField
                            field={field}
                            label="Mật khẩu"
                            type="password"
                            autoComplete="new-password"
                            description={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
                        />
                    )}
                </form.Field>

                <AuthResult result={result} />

                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                    {([canSubmit, submitting]) => (
                        <AuthSubmit
                            canSubmit={canSubmit}
                            submitting={submitting}
                        >
                            Tạo tài khoản
                        </AuthSubmit>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
}
