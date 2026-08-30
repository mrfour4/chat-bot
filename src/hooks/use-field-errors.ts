"use client";

import { useTranslations } from "next-intl";

import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import { MAX_QUESTION_LENGTH } from "@/lib/validation/chat";

type FieldIssue = { message?: string } | undefined;

export function useFieldErrors() {
    const t = useTranslations("validation");

    return (errors: readonly FieldIssue[]) =>
        errors.map((error) =>
            error?.message
                ? {
                      message: t(error.message, {
                          min: MIN_PASSWORD_LENGTH,
                          max: MAX_QUESTION_LENGTH,
                          size: Math.round(MAX_UPLOAD_BYTES / (1024 * 1024)),
                      }),
                  }
                : error,
        );
}
