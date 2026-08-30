"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { signIn, type AuthFormState } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthResult } from "@/components/auth/auth-result";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FieldGroup } from "@/components/ui/field";
import { notifyError } from "@/lib/notify";
import { signInSchema } from "@/lib/validation/auth";

export function SignInForm() {
    const t = useTranslations("auth");
    const [result, setResult] = useState<AuthFormState>({});

    const form = useForm({
        defaultValues: { email: "", password: "" },
        validators: { onChange: signInSchema },
        onSubmit: async ({ value }) => {
            setResult({});
            const outcome = await signIn(value);
            setResult(outcome);
            if (outcome.error) notifyError(t("failed"), outcome.error);
        },
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
            className="rounded-lg border border-rule bg-surface p-6"
        >
            <FieldGroup>
                <form.Field name="email">
                    {(field) => (
                        <AuthField
                            field={field}
                            label={t("email")}
                            type="email"
                            autoComplete="email"
                        />
                    )}
                </form.Field>

                <form.Field name="password">
                    {(field) => (
                        <AuthField
                            field={field}
                            label={t("password")}
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
                            {t("signIn")}
                        </AuthSubmit>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
}
