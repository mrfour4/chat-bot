import { z } from "zod";

export const MAX_TITLE_LENGTH = 200;

export const renameDocumentSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "titleRequired")
        .max(MAX_TITLE_LENGTH, "titleTooLong"),
});

export type RenameDocumentInput = z.infer<typeof renameDocumentSchema>;
