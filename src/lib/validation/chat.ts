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

export const MAX_CONVERSATION_TITLE_LENGTH = 120;

export const renameConversationSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "titleRequired")
        .max(MAX_CONVERSATION_TITLE_LENGTH, "titleTooLong"),
});

export type RenameConversationInput = z.infer<typeof renameConversationSchema>;
