"use client";

import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";
import { useFieldErrors } from "@/hooks/use-field-errors";
import { MAX_UPLOAD_FILES, uploadSchema } from "@/lib/validation/upload";

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export function DocumentUploadForm({
    uploading,
    onUpload,
}: {
    uploading: boolean;
    onUpload: (files: File[]) => void;
}) {
    const t = useTranslations("documents");
    const translateErrors = useFieldErrors();

    const form = useForm({
        defaultValues: { files: [] as File[] },
        validators: { onChange: uploadSchema },
        onSubmit: ({ value }) => {
            if (value.files.length > 0) onUpload(value.files);
        },
    });

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
            className="mt-8 rounded-lg border border-rule bg-panel/60 p-5"
        >
            <form.Field name="files">
                {(field) => {
                    const errors = field.state.meta.errors;
                    const invalid =
                        field.state.meta.isTouched && errors.length > 0;

                    return (
                        <Field data-invalid={invalid || undefined}>
                            <FieldLabel htmlFor="document-file">
                                {t("fileLabel")}
                            </FieldLabel>

                            <div className="flex flex-wrap items-center gap-3">
                                <Input
                                    id="document-file"
                                    type="file"
                                    multiple
                                    accept="application/pdf,.pdf"
                                    disabled={uploading}
                                    aria-invalid={invalid || undefined}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => {
                                        field.handleChange([
                                            ...(event.target.files ?? []),
                                        ]);
                                    }}
                                    className="h-9 min-w-0 flex-1 border-rule bg-paper py-1.5 text-ink-soft file:mr-3 file:cursor-pointer file:font-medium file:text-ink"
                                />

                                <form.Subscribe
                                    selector={(state) => ({
                                        canSubmit: state.canSubmit,
                                        count: state.values.files.length,
                                    })}
                                >
                                    {({ canSubmit, count }) => (
                                        <Button
                                            type="submit"
                                            disabled={!canSubmit || uploading}
                                        >
                                            {uploading && <Spinner />}
                                            {uploading
                                                ? t("uploading")
                                                : t("upload", { count })}
                                        </Button>
                                    )}
                                </form.Subscribe>
                            </div>

                            {invalid ? (
                                <FieldError errors={translateErrors(errors)} />
                            ) : (
                                <FieldDescription>
                                    {t("uploadHint", {
                                        size: MAX_MEGABYTES,
                                        max: MAX_UPLOAD_FILES,
                                    })}
                                </FieldDescription>
                            )}
                        </Field>
                    );
                }}
            </form.Field>
        </form>
    );
}
