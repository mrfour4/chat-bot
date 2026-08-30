import { z } from "zod";

/**
 * The credential rules, in one place.
 *
 * Messages are message *keys*, not sentences: the same schema runs in the
 * browser and in the server action, and only the caller knows the reader's
 * language. `useFieldErrors` translates them for a form; the actions translate
 * them with `getTranslations`.
 */
export const MIN_PASSWORD_LENGTH = 8;

export const signInSchema = z.object({
    email: z.email("email"),
    password: z.string().min(1, "passwordRequired"),
});

export const signUpSchema = z.object({
    // Not optional: the field is always present in the form, and an empty
    // string is a legitimate value the action turns into null.
    fullName: z.string().trim().max(120, "nameTooLong"),
    email: z.email("email"),
    password: z.string().min(MIN_PASSWORD_LENGTH, "passwordTooShort"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
