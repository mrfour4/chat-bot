import type { Metadata } from "next";
import {
    Be_Vietnam_Pro,
    Bricolage_Grotesque,
    JetBrains_Mono,
} from "next/font/google";

import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/layout/site-header";
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

export const metadata: Metadata = {
    title: "Cố vấn Tuyển sinh",
    description:
        "Hỏi đáp tuyển sinh dựa trên văn bản chính thức do nhà trường công bố.",
};

export default async function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const user = await getSessionUser();

    return (
        // The font variables live on <html>: the base layer applies `font-sans`
        // there, and a custom property declared lower down would not resolve.
        <html
            lang="vi"
            className={`${bricolage.variable} ${beVietnam.variable} ${jetbrains.variable}`}
        >
            <body className="flex min-h-dvh flex-col">
                <Providers>
                    <SiteHeader user={user} />
                    <main className="flex-1">{children}</main>
                </Providers>
            </body>
        </html>
    );
}
