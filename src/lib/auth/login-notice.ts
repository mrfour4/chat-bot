const KEYS = {
    "password-reset": "noticePasswordReset",
} as const;

export type LoginNoticeKey = (typeof KEYS)[keyof typeof KEYS];

export function loginNoticeKey(
    value: string | null | undefined,
): LoginNoticeKey | null {
    if (!value) return null;
    return Object.hasOwn(KEYS, value) ? KEYS[value as keyof typeof KEYS] : null;
}
