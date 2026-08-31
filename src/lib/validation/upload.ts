import { z } from "zod";

import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";

export const MAX_UPLOAD_FILES = 10;

const pdfFile = z
    .instanceof(File, { message: "fileRequired" })
    .refine((file) => file.size > 0, "fileEmpty")
    .refine((file) => file.size <= MAX_UPLOAD_BYTES, "fileTooLarge");

export const uploadSchema = z.object({
    files: z
        .array(pdfFile)
        .min(1, "fileRequired")
        .max(MAX_UPLOAD_FILES, "tooManyFiles"),
});

export type UploadInput = z.infer<typeof uploadSchema>;

export type UploadRefusal = {
    key: "fileRequired" | "tooManyFiles" | "fileEmpty" | "fileTooLarge";
    name?: string;
};

export function describeRefusal(files: File[]): UploadRefusal | null {
    if (files.length === 0) return { key: "fileRequired" };
    if (files.length > MAX_UPLOAD_FILES) return { key: "tooManyFiles" };

    const empty = files.find((file) => file.size === 0);
    if (empty) return { key: "fileEmpty", name: empty.name };

    const large = files.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (large) return { key: "fileTooLarge", name: large.name };

    return null;
}
