import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/constants/i18n";

/**
 * Locale without routing.
 *
 * The alternative -- a `[locale]` segment -- would mean rewriting every route,
 * `Link`, redirect and `requireTeacher()` bounce in the app to carry a prefix,
 * for an audience that is almost entirely Vietnamese. A cookie costs none of
 * that and can be swapped for routing later without touching a message.
 */
export default getRequestConfig(async () => {
    const store = await cookies();
    const cookieValue = store.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
