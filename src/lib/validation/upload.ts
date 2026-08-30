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
        .instanceof(File, { message: "Chọn một tệp PDF." })
        .refine((file) => file.size > 0, "Tệp rỗng.")
        .refine(
            (file) => file.size <= MAX_UPLOAD_BYTES,
            `Tệp vượt quá ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
        ),
});

export type UploadInput = z.infer<typeof uploadSchema>;
