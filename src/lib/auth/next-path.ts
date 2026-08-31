const CONTROL_OR_SPACE = /[\u0000-\u0020\u007f]/;

export function safeNextPath(value: string | null | undefined): string {
    if (!value) return "/";
    if (CONTROL_OR_SPACE.test(value)) return "/";
    if (value.includes("\\")) return "/";
    if (!value.startsWith("/")) return "/";
    if (value.startsWith("//")) return "/";
    return value;
}
