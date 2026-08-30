import type { Metadata } from "next";
import { Be_Vietnam_Pro, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
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
    <html lang="vi">
      <body
        className={`${bricolage.variable} ${beVietnam.variable} ${jetbrains.variable} flex min-h-dvh flex-col`}
      >
        <SiteHeader user={user} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-5xl px-5 py-6">
            <p className="eyebrow">
              Trả lời chỉ dựa trên tài liệu tuyển sinh đã tải lên
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
