import { describe, expect, it } from "vitest";

import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import {
    changePasswordSchema,
    displayNameSchema,
} from "@/lib/validation/profile";

const issues = (result: { success: boolean; error?: { issues: unknown[] } }) =>
    (result.error?.issues ?? []).map(
        (issue) => (issue as { message: string }).message,
    );

describe("displayNameSchema", () => {
    it("trims, because a name of spaces is a blank name", () => {
        const result = displayNameSchema.safeParse({ fullName: "  Tú Lê  " });
        expect(result.success && result.data.fullName).toBe("Tú Lê");
    });

    it("accepts an empty name, which clears it", () => {
        expect(displayNameSchema.safeParse({ fullName: "" }).success).toBe(
            true,
        );
    });

    it("refuses a name too long for the column", () => {
        const result = displayNameSchema.safeParse({
            fullName: "x".repeat(121),
        });
        expect(issues(result)).toContain("nameTooLong");
    });
});

describe("changePasswordSchema", () => {
    const valid = {
        currentPassword: "old-password",
        newPassword: "a-new-password",
    };

    it("accepts a change", () => {
        expect(changePasswordSchema.safeParse(valid).success).toBe(true);
    });

    it("requires the current password, which is what proves it is you", () => {
        const result = changePasswordSchema.safeParse({
            ...valid,
            currentPassword: "",
        });
        expect(issues(result)).toContain("passwordRequired");
    });

    it("holds the new password to the same length as sign-up", () => {
        const result = changePasswordSchema.safeParse({
            ...valid,
            newPassword: "x".repeat(MIN_PASSWORD_LENGTH - 1),
        });
        expect(issues(result)).toContain("passwordTooShort");
    });

    it("refuses a no-op, which would report success while changing nothing", () => {
        const result = changePasswordSchema.safeParse({
            currentPassword: "same-password",
            newPassword: "same-password",
        });
        expect(issues(result)).toContain("passwordUnchanged");
    });
});
