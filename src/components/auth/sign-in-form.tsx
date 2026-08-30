"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { signIn, type AuthFormState } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthResult } from "@/components/auth/auth-result";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FieldGroup } from "@/components/ui/field";
import { signInSchema } from "@/lib/validation/auth";

export function SignInForm() {
    const [result, setResult] = useState<AuthFormState>({});

    const form = useForm({
        defaultValues: { email: "", password: "" },
        validators: { onChange: signInSchema },
        onSubmit: async ({ value }) => {
            setResult({});
            setResult(await signIn(value));
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
                            autoComplete="current-password"
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
                            Đăng nhập
                        </AuthSubmit>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
}
