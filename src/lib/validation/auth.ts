import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const signInSchema = z.object({
    email: z.email("email"),
    password: z.string().min(1, "passwordRequired"),
});

export const signUpSchema = z.object({
    fullName: z.string().trim().max(120, "nameTooLong"),
    email: z.email("email"),
    password: z.string().min(MIN_PASSWORD_LENGTH, "passwordTooShort"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
