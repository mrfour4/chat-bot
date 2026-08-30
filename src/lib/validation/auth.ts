import { z } from "zod";

/**
 * The credential rules, in one place.
 *
 * Imported by the form for instant feedback and by the server action for the
 * decision that actually matters. A client-side rule the server does not also
 * enforce is decoration, and two copies of the same rule drift.
 */
export const MIN_PASSWORD_LENGTH = 8;

export const signInSchema = z.object({
    email: z.email("Email không hợp lệ."),
    password: z.string().min(1, "Nhập mật khẩu."),
});

export const signUpSchema = z.object({
    // Not optional: the field is always present in the form, and an empty
    // string is a legitimate value the action turns into null.
    fullName: z.string().trim().max(120),
    email: z.email("Email không hợp lệ."),
    password: z
        .string()
        .min(
            MIN_PASSWORD_LENGTH,
            `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
        ),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
