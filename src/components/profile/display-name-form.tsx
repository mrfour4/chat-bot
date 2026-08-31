"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
    updateDisplayName,
    type ProfileFormState,
} from "@/app/profile/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthResult } from "@/components/auth/auth-result";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { FieldGroup } from "@/components/ui/field";
import { notifyError, notifySuccess } from "@/lib/notify";
import { displayNameSchema } from "@/lib/validation/profile";

export function DisplayNameForm({ fullName }: { fullName: string | null }) {
    const t = useTranslations("profile");
    const [result, setResult] = useState<ProfileFormState>({});

    const form = useForm({
        defaultValues: { fullName: fullName ?? "" },
        validators: { onChange: displayNameSchema },
        onSubmit: async ({ value }) => {
            setResult({});
            const outcome = await updateDisplayName(value);
            setResult(outcome);
            if (outcome.error) notifyError(t("failed"), outcome.error);
            if (outcome.notice) notifySuccess(outcome.notice);
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
                <form.Field name="fullName">
                    {(field) => (
                        <AuthField
                            field={field}
                            label={t("displayName")}
                            type="text"
                            autoComplete="name"
                            description={t("displayNameHelp")}
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
                            {t("save")}
                        </AuthSubmit>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
}
