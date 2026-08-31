"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ProfileFormState } from "@/app/profile/actions";
import { sendPasswordReset } from "@/app/profile/password-actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthResult } from "@/components/auth/auth-result";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FieldGroup } from "@/components/ui/field";
import { notifyError } from "@/lib/notify";
import { forgotPasswordSchema } from "@/lib/validation/profile";

export function ForgotPasswordForm() {
    const t = useTranslations("auth");
    const [result, setResult] = useState<ProfileFormState>({});

    const form = useForm({
        defaultValues: { email: "" },
        validators: { onChange: forgotPasswordSchema },
        onSubmit: async ({ value }) => {
            setResult({});
            const outcome = await sendPasswordReset(value);
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

                <AuthResult result={result} />

                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                    {([canSubmit, submitting]) => (
                        <AuthSubmit
                            canSubmit={canSubmit}
                            submitting={submitting}
                        >
                            {t("sendResetLink")}
                        </AuthSubmit>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
}
