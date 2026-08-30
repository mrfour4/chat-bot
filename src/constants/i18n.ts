export const LOCALES = ["vi", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Vietnamese, not English. The documents are Vietnamese, the students are
 * Vietnamese, and an English default would make the common case the one that
 * needs changing.
 */
export const DEFAULT_LOCALE: Locale = "vi";

/** Where the chosen locale is remembered. Read on the server, set by an action. */
export const LOCALE_COOKIE = "locale";

export const LOCALE_LABELS: Record<Locale, string> = {
    vi: "Tiếng Việt",
    en: "English",
};

export function isLocale(value: string | undefined): value is Locale {
    return LOCALES.includes(value as Locale);
}
