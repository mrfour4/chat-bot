import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/constants/i18n";

export default getRequestConfig(async () => {
    const store = await cookies();
    const cookieValue = store.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
