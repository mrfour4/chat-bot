import Link from "next/link";

import { SealMark } from "@/components/layout/seal-mark";
import { SiteNav } from "@/components/layout/site-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth";
import type { NavItem } from "@/components/layout/site-nav";

export function SiteHeader({ user }: { user: SessionUser | null }) {
    const isTeacher = user?.profile.role === "teacher";

    const items: NavItem[] = [
        { href: "/", label: "Hỏi đáp" },
        ...(user ? [{ href: "/history", label: "Lịch sử" }] : []),
        ...(isTeacher
            ? [{ href: "/teacher/documents", label: "Tài liệu" }]
            : []),
    ];

    return (
        // Sticky because this is the app's only navigation, and the history page
        // -- the one you most want to leave -- is also the longest.
        <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5 sm:gap-4">
                <Link
                    href="/"
                    className="flex min-w-0 items-center gap-2.5 text-lacquer"
                >
                    <SealMark size={26} />
                    {/* Truncates rather than pushing the row wider than the viewport. */}
                    <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                        Cố vấn Tuyển sinh
                    </span>
                </Link>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    <SiteNav items={items} />

                    {user ? (
                        <UserMenu user={user} />
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            render={<Link href="/login">Đăng nhập</Link>}
                        />
                    )}
                </div>
            </div>
        </header>
    );
}
