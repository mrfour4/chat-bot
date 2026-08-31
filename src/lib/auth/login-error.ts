const KEYS = {
    oauth: "errorOauth",
    oauth_cancelled: "errorOauthCancelled",
    confirm: "errorConfirm",
    recovery: "errorRecovery",
} as const;

export type LoginErrorKey = (typeof KEYS)[keyof typeof KEYS];

export function loginErrorKey(
    value: string | null | undefined,
): LoginErrorKey | null {
    if (!value) return null;
    return Object.hasOwn(KEYS, value) ? KEYS[value as keyof typeof KEYS] : null;
}
