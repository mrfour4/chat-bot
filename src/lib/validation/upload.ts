import { z } from "zod";

import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";

export const uploadSchema = z.object({
    file: z
        .instanceof(File, { message: "fileRequired" })
        .refine((file) => file.size > 0, "fileEmpty")
        .refine((file) => file.size <= MAX_UPLOAD_BYTES, "fileTooLarge"),
});

export type UploadInput = z.infer<typeof uploadSchema>;
