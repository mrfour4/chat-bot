import { z } from "zod";

import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";

/**
 * What the browser can check before spending a request.
 *
 * The signature check that actually decides whether this is a PDF lives in
 * `validateUpload()` on the server, because the browser derives `File.type`
 * from the extension and a renamed executable arrives claiming to be a PDF.
 */
export const uploadSchema = z.object({
    file: z
        .instanceof(File, { message: "fileRequired" })
        .refine((file) => file.size > 0, "fileEmpty")
        .refine((file) => file.size <= MAX_UPLOAD_BYTES, "fileTooLarge"),
});

export type UploadInput = z.infer<typeof uploadSchema>;
