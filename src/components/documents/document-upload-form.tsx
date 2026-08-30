"use client";

import { useForm } from "@tanstack/react-form";
import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { uploadSchema } from "@/lib/validation/upload";

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export function DocumentUploadForm({
    uploading,
    error,
    onUpload,
    onReset,
}: {
    uploading: boolean;
    error: string | null;
    onUpload: (file: File) => void;
    onReset: () => void;
}) {
    const form = useForm({
        defaultValues: { file: null as File | null },
        validators: { onChange: uploadSchema },
        onSubmit: ({ value }) => {
            if (value.file) onUpload(value.file);
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
            <form.Field name="file">
                {(field) => {
                    const errors = field.state.meta.errors;
                    const invalid =
                        field.state.meta.isTouched && errors.length > 0;

                    return (
                        <Field data-invalid={invalid || undefined}>
                            <FieldLabel htmlFor="document-file">
                                Tệp PDF
                            </FieldLabel>

                            <div className="flex flex-wrap items-center gap-3">
                                <Input
                                    id="document-file"
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    disabled={uploading}
                                    aria-invalid={invalid || undefined}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => {
                                        field.handleChange(
                                            event.target.files?.[0] ?? null,
                                        );
                                        onReset();
                                    }}
                                    className="h-9 min-w-0 flex-1 border-rule bg-paper py-1.5 text-ink-soft file:mr-3 file:cursor-pointer file:font-medium file:text-ink"
                                />

                                <form.Subscribe
                                    selector={(state) => state.canSubmit}
                                >
                                    {(canSubmit) => (
                                        <Button
                                            type="submit"
                                            disabled={!canSubmit || uploading}
                                        >
                                            {uploading && <Spinner />}
                                            {uploading
                                                ? "Đang tải lên…"
                                                : "Tải lên"}
                                        </Button>
                                    )}
                                </form.Subscribe>
                            </div>

                            {invalid ? (
                                <FieldError errors={errors} />
                            ) : (
                                !error && (
                                    <FieldDescription>
                                        Chỉ nhận tệp PDF, tối đa {MAX_MEGABYTES}{" "}
                                        MB. Sau khi tải lên xong, việc lập chỉ
                                        mục chạy nền — bạn có thể rời khỏi trang
                                        hoặc đóng trình duyệt.
                                    </FieldDescription>
                                )
                            )}
                        </Field>
                    );
                }}
            </form.Field>

            {error && (
                <Alert variant="destructive" className="mt-3">
                    <TriangleAlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </form>
    );
}
