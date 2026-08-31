export type AuthErrorKind = "none" | "rate-limited" | "unreachable" | "refused";

export function authErrorKind(
    error: { status?: number | null } | null | undefined,
): AuthErrorKind {
    if (!error) return "none";
    if (error.status === 429) return "rate-limited";
    if (!error.status) return "unreachable";
    return "refused";
}
