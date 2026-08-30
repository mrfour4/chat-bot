import { describe, expect, it } from "vitest";

import {
    MIN_PASSWORD_LENGTH,
    signInSchema,
    signUpSchema,
} from "@/lib/validation/auth";

describe("signInSchema", () => {
    it("accepts a plausible credential pair", () => {
        expect(
            signInSchema.safeParse({
                email: "hoc.sinh@example.edu.vn",
                password: "mat-khau",
            }).success,
        ).toBe(true);
    });

    it("rejects an address that is not an email", () => {
        expect(
            signInSchema.safeParse({ email: "hoc.sinh", password: "x" })
                .success,
        ).toBe(false);
    });

    it("does not impose a length rule on sign-in", () => {
        const result = signInSchema.safeParse({
            email: "cu@example.edu.vn",
            password: "short",
        });
        expect(result.success).toBe(true);
    });
});

describe("signUpSchema", () => {
    it("requires the minimum password length", () => {
        const result = signUpSchema.safeParse({
            fullName: "Nguyễn Văn A",
            email: "a@example.edu.vn",
            password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
        });

        expect(result.success).toBe(false);

        expect(result.error?.issues[0]?.message).toBe("passwordTooShort");
    });

    it("accepts an empty name", () => {
        expect(
            signUpSchema.safeParse({
                fullName: "",
                email: "a@example.edu.vn",
                password: "a".repeat(MIN_PASSWORD_LENGTH),
            }).success,
        ).toBe(true);
    });

    it("trims the name rather than storing the spaces", () => {
        const result = signUpSchema.safeParse({
            fullName: "  Nguyễn Văn A  ",
            email: "a@example.edu.vn",
            password: "a".repeat(MIN_PASSWORD_LENGTH),
        });

        expect(result.data?.fullName).toBe("Nguyễn Văn A");
    });
});
