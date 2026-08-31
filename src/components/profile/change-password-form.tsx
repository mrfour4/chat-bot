"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ProfileFormState } from "@/app/profile/actions";
import { changePassword } from "@/app/profile/password-actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthResult } from "@/components/auth/auth-result";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FieldGroup } from "@/components/ui/field";
import { notifyError, notifySuccess } from "@/lib/notify";
import { changePasswordSchema } from "@/lib/validation/profile";

export function ChangePasswordForm() {
    const t = useTranslations("profile");
    const [result, setResult] = useState<ProfileFormState>({});

    const form = useForm({
        defaultValues: { currentPassword: "", newPassword: "" },
        validators: { onChange: changePasswordSchema },
        onSubmit: async ({ value }) => {
            setResult({});
            const outcome = await changePassword(value);
            setResult(outcome);
            if (outcome.error) notifyError(t("failed"), outcome.error);
            if (outcome.notice) {
                notifySuccess(outcome.notice);
                form.reset();
            }
        },
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            <FieldGroup>
                <form.Field name="currentPassword">
                    {(field) => (
                        <AuthField
                            field={field}
                            label={t("currentPassword")}
                            type="password"
                            autoComplete="current-password"
                        />
                    )}
                </form.Field>

                <form.Field name="newPassword">
                    {(field) => (
                        <AuthField
                            field={field}
                            label={t("newPassword")}
                            type="password"
                            autoComplete="new-password"
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
                            {t("changePassword")}
                        </AuthSubmit>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
}
