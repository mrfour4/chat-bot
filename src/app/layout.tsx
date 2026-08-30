import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import {
    Be_Vietnam_Pro,
    Bricolage_Grotesque,
    JetBrains_Mono,
} from "next/font/google";

import { AppProviders } from "@/providers";
import { SiteHeader } from "@/components/layout";
import { getSessionUser } from "@/lib/auth";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
    variable: "--font-bricolage",
    subsets: ["latin", "vietnamese"],
    display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
    variable: "--font-be-vietnam",
    subsets: ["latin", "vietnamese"],
    weight: ["400", "500", "600"],
    display: "swap",
});

const jetbrains = JetBrains_Mono({
    variable: "--font-jetbrains",
    subsets: ["latin", "vietnamese"],
    weight: ["400", "500"],
    display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations();
    return {
        title: t("common.appName"),
        description: t("home.description"),
    };
}

export default async function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const [user, locale] = await Promise.all([getSessionUser(), getLocale()]);

    return (
        <html
            lang={locale}
            className={`${bricolage.variable} ${beVietnam.variable} ${jetbrains.variable}`}
        >
            <body className="flex min-h-dvh flex-col">
                <NextIntlClientProvider>
                    <AppProviders>
                        <SiteHeader user={user} />
                        <main className="flex-1">{children}</main>
                    </AppProviders>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
