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
