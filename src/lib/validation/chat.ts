import { z } from "zod";

export const MAX_QUESTION_LENGTH = 1000;

export const questionSchema = z.object({
    question: z
        .string()
        .trim()
        .min(1, "Nhập câu hỏi của bạn.")
        .max(
            MAX_QUESTION_LENGTH,
            `Câu hỏi tối đa ${MAX_QUESTION_LENGTH} ký tự.`,
        ),
});

export type QuestionInput = z.infer<typeof questionSchema>;
