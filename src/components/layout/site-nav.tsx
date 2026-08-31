"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export type NavItem = { href: string; labelKey: string };

export function SiteNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    const t = useTranslations("nav");

    return (
        <nav
            aria-label={t("label")}
            className="flex w-max items-center gap-0.5"
        >
            {items.map((item) => {
                const active =
                    item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}

                        aria-current={active ? "page" : undefined}
                        className="rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap text-ink-soft transition-colors hover:bg-panel hover:text-ink aria-[current=page]:bg-panel aria-[current=page]:font-medium aria-[current=page]:text-ink"
                    >
                        {t(item.labelKey)}
                    </Link>
                );
            })}
        </nav>
    );
}
