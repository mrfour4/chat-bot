"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isLocale, LOCALE_COOKIE } from "@/constants/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(value: string) {
    if (!isLocale(value)) return;

    const store = await cookies();
    store.set(LOCALE_COOKIE, value, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
    });

    // Every page renders its own strings on the server, so the whole tree has
    // to be rebuilt -- not just the switcher that was clicked.
    revalidatePath("/", "layout");
}
