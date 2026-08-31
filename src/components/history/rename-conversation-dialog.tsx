"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useFieldErrors } from "@/hooks/use-field-errors";
import type { ConversationSummary } from "@/lib/chat/conversations";
import { renameConversationSchema } from "@/lib/validation/chat";

export function RenameConversationDialog({
    conversation,
    open,
    onOpenChange,
    pending,
    onRename,
}: {
    conversation: ConversationSummary;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pending: boolean;
    onRename: (input: { id: string; title: string }) => void;
}) {
    const t = useTranslations("history");
    const tc = useTranslations("common");
    const translateErrors = useFieldErrors();

    const form = useForm({
        defaultValues: { title: conversation.title ?? "" },
        validators: { onChange: renameConversationSchema },
        onSubmit: ({ value }) => {
            onRename({ id: conversation.id, title: value.title.trim() });
            onOpenChange(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{t("renameTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("renameDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <form.Field name="title">
                            {(field) => {
                                const errors = field.state.meta.errors;
                                const invalid =
                                    field.state.meta.isDirty &&
                                    errors.length > 0;

                                return (
                                    <Field data-invalid={invalid || undefined}>
                                        <FieldLabel htmlFor="conversation-title">
                                            {t("titleLabel")}
                                        </FieldLabel>
                                        <Input
                                            id="conversation-title"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) =>
                                                field.handleChange(
                                                    event.target.value,
                                                )
                                            }
                                            aria-invalid={invalid || undefined}
                                            autoFocus
                                        />
                                        {invalid && (
                                            <FieldError
                                                errors={translateErrors(errors)}
                                            />
                                        )}
                                    </Field>
                                );
                            }}
                        </form.Field>
                    </div>

                    <DialogFooter>
                        <DialogClose
                            render={
                                <Button variant="outline" type="button">
                                    {tc("cancel")}
                                </Button>
                            }
                        />
                        <form.Subscribe selector={(state) => state.canSubmit}>
                            {(canSubmit) => (
                                <Button
                                    type="submit"
                                    disabled={!canSubmit || pending}
                                >
                                    {pending && <Spinner />}
                                    {tc("save")}
                                </Button>
                            )}
                        </form.Subscribe>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
