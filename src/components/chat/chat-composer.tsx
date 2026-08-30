"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";

import { ChatError } from "@/components/chat/chat-error";
import { SuggestionList } from "@/components/chat/suggestion-list";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFieldErrors } from "@/hooks/use-field-errors";
import { questionSchema } from "@/lib/validation/chat";

export function ChatComposer({
    pending,
    error,
    showSuggestions,
    onAsk,
}: {
    pending: boolean;
    error: string | null;
    showSuggestions: boolean;
    onAsk: (question: string) => void;
}) {
    const t = useTranslations("chat");
    const translateErrors = useFieldErrors();

    const form = useForm({
        defaultValues: { question: "" },
        validators: { onChange: questionSchema },
        onSubmit: ({ value }) => {
            onAsk(value.question.trim());
            form.reset();
        },
    });

    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/90 backdrop-blur">
            <div className="mx-auto w-full max-w-2xl px-5 py-4">
                {error && <ChatError message={error} />}

                {showSuggestions && (
                    <SuggestionList
                        disabled={pending}
                        onSelect={(suggestion) => onAsk(suggestion)}
                    />
                )}

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field name="question">
                        {(field) => {
                            const errors = field.state.meta.errors;

                            const invalid =
                                field.state.meta.isDirty && errors.length > 0;

                            return (
                                <Field data-invalid={invalid || undefined}>
                                    <div className="flex items-center gap-2 rounded-lg border border-rule bg-surface p-2 transition-colors focus-within:border-ink">
                                        <Input
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) =>
                                                field.handleChange(
                                                    event.target.value,
                                                )
                                            }
                                            disabled={pending}
                                            placeholder={t("placeholder")}
                                            aria-label={t("inputLabel")}
                                            aria-invalid={invalid || undefined}
                                            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                        />
                                        <form.Subscribe
                                            selector={(state) =>
                                                state.canSubmit
                                            }
                                        >
                                            {(canSubmit) => (
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        pending || !canSubmit
                                                    }
                                                    className="shrink-0"
                                                >
                                                    {t("submit")}
                                                </Button>
                                            )}
                                        </form.Subscribe>
                                    </div>
                                    {invalid && (
                                        <FieldError
                                            errors={translateErrors(errors)}
                                        />
                                    )}
                                </Field>
                            );
                        }}
                    </form.Field>
                </form>
            </div>
        </div>
    );
}
