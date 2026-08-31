import Link from "next/link";
import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SealMark } from "@/components/layout/seal-mark";
import { SiteNav } from "@/components/layout/site-nav";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import type { NavItem } from "@/components/layout/site-nav";

export function SiteHeader({
    user,
    avatarUrl,
}: {
    user: SessionUser | null;
    avatarUrl: string | null;
}) {
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
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2 sm:gap-x-3 sm:px-5 md:h-16 md:flex-nowrap md:gap-x-4 md:py-0">
                <Link
                    href="/"
                    className="order-1 flex min-w-0 shrink items-center gap-2.5 text-lacquer"
                >
                    <SealMark size={26} />
                    <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                        {tc("appName")}
                    </span>
                </Link>

                <nav className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 md:order-2 md:mx-0 md:ml-auto md:w-auto md:overflow-visible md:px-0">
                    <SiteNav items={items} />
                </nav>

                <div className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:order-3 md:ml-0 md:gap-3">
                    <ThemeSwitcher />
                    <LanguageSwitcher />

                    {user ? (
                        <UserMenu user={user} avatarUrl={avatarUrl} />
                    ) : (
                        <Link
                            href="/login"
                            className={cn(
                                buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                }),
                                "shrink-0",
                            )}
                        >
                            {t("signIn")}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
