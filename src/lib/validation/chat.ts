import { z } from "zod";

export const MAX_QUESTION_LENGTH = 1000;

export const questionSchema = z.object({
    question: z
        .string()
        .trim()
        .min(1, "questionRequired")
        .max(MAX_QUESTION_LENGTH, "questionTooLong"),
});

export type QuestionInput = z.infer<typeof questionSchema>;
