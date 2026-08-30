import Link from "next/link";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SealMark } from "@/components/layout/seal-mark";
import { SiteNav } from "@/components/layout/site-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth";
import type { NavItem } from "@/components/layout/site-nav";

export function SiteHeader({ user }: { user: SessionUser | null }) {
    const t = useTranslations("nav");
    const tc = useTranslations("common");
    const isTeacher = user?.profile.role === "teacher";

    const items: NavItem[] = [
        { href: "/", labelKey: "chat" },
        ...(user ? [{ href: "/history", labelKey: "history" }] : []),
        ...(isTeacher
            ? [{ href: "/teacher/documents", labelKey: "documents" }]
            : []),
    ];

    return (
        <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5 sm:gap-4">
                <Link
                    href="/"
                    className="flex min-w-0 items-center gap-2.5 text-lacquer"
                >
                    <SealMark size={26} />
                    <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                        {tc("appName")}
                    </span>
                </Link>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <SiteNav items={items} />
                    <LanguageSwitcher />

                    {user ? (
                        <UserMenu user={user} />
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            render={<Link href="/login">{t("signIn")}</Link>}
                        />
                    )}
                </div>
            </div>
        </header>
    );
}
