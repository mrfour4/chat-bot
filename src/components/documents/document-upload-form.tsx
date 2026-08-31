"use client";

import { useForm } from "@tanstack/react-form";
import { PaperclipIcon } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";

import { SelectedFiles } from "@/components/documents/selected-files";
import { UploadButton } from "@/components/documents/upload-button";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";
import {
    describeRefusal,
    MAX_UPLOAD_FILES,
    uploadSchema,
} from "@/lib/validation/upload";

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export function DocumentUploadForm({
    uploading,
    onUpload,
}: {
    uploading: boolean;
    onUpload: (files: File[]) => void;
}) {
    const t = useTranslations("documents");
    const tv = useTranslations("validation");
    const inputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        defaultValues: { files: [] as File[] },
        validators: { onChange: uploadSchema },
        onSubmit: ({ value }) => {
            if (describeRefusal(value.files)) return;
            onUpload(value.files);
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
                    const files = field.state.value;
                    const refusal = describeRefusal(files);

                    const reason = refusal
                        ? tv(refusal.key, {
                              size: MAX_MEGABYTES,
                              maxFiles: MAX_UPLOAD_FILES,
                              name: refusal.name ?? "",
                          })
                        : null;

                    const replace = (next: File[]) => {
                        field.handleChange(next);
                        if (next.length === 0 && inputRef.current) {
                            inputRef.current.value = "";
                        }
                    };

                    // Nothing chosen yet is not an error, it is the starting
                    // state; only a selection that cannot be sent is.
                    const invalid = Boolean(refusal) && files.length > 0;

                    return (
                        <Field data-invalid={invalid || undefined}>
                            <FieldLabel htmlFor="document-file">
                                {t("fileLabel")}
                            </FieldLabel>

                            <input
                                ref={inputRef}
                                id="document-file"
                                type="file"
                                multiple
                                accept="application/pdf,.pdf"
                                disabled={uploading}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                    replace([...(event.target.files ?? [])])
                                }
                                className="sr-only"
                            />

                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={uploading}
                                    onClick={() => inputRef.current?.click()}
                                >
                                    <PaperclipIcon data-icon="inline-start" />
                                    {files.length === 0
                                        ? t("chooseFiles")
                                        : t("changeFiles")}
                                </Button>

                                <UploadButton
                                    count={files.length}
                                    uploading={uploading}
                                    refusal={refusal}
                                    reason={reason}
                                />

                                {files.length > 1 && !uploading && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => replace([])}
                                        className="text-ink-soft"
                                    >
                                        {t("clearFiles")}
                                    </Button>
                                )}
                            </div>

                            <SelectedFiles
                                files={files}
                                disabled={uploading}
                                onRemove={(index) =>
                                    replace(
                                        files.filter((_, at) => at !== index),
                                    )
                                }
                            />

                            {invalid && reason ? (
                                <FieldError errors={[{ message: reason }]} />
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
