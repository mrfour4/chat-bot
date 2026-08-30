export const LOCALES = ["vi", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

export const LOCALE_COOKIE = "locale";

export const LOCALE_LABELS: Record<Locale, string> = {
    vi: "Tiếng Việt",
    en: "English",
};

export function isLocale(value: string | undefined): value is Locale {
    return LOCALES.includes(value as Locale);
}
