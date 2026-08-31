import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

export const displayNameSchema = z.object({
    fullName: z.string().trim().max(120, "nameTooLong"),
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "passwordRequired"),
        newPassword: z.string().min(MIN_PASSWORD_LENGTH, "passwordTooShort"),
    })
    .refine((value) => value.currentPassword !== value.newPassword, {
        path: ["newPassword"],
        message: "passwordUnchanged",
    });

export const setPasswordSchema = z.object({
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, "passwordTooShort"),
});

export const forgotPasswordSchema = z.object({
    email: z.email("email"),
});

export type DisplayNameInput = z.infer<typeof displayNameSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
