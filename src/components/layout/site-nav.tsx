"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export type NavItem = { href: string; labelKey: string };

/**
 * The navigation links, split out because knowing the current page needs
 * `usePathname` and therefore the client. The header shell stays a server
 * component and holds the session; only the labels and hrefs cross over.
 */
export function SiteNav({ items }: { items: NavItem[] }) {
    const pathname = usePathname();
    const t = useTranslations("nav");

    return (
        <nav aria-label={t("label")} className="flex items-center gap-0.5">
            {items.map((item) => {
                // `startsWith` so a nested route (/chat/<id>) still marks its section.
                // "/" would match everything, so it is compared exactly.
                const active =
                    item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        // The styling is selected from aria-current rather than set beside
                        // it, so what a screen reader announces and what the eye sees
                        // cannot drift apart.
                        aria-current={active ? "page" : undefined}
                        className="rounded-md px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-panel hover:text-ink aria-[current=page]:bg-panel aria-[current=page]:font-medium aria-[current=page]:text-ink"
                    >
                        {t(item.labelKey)}
                    </Link>
                );
            })}
        </nav>
    );
}
