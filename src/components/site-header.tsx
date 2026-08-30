import Link from "next/link";

import { SealMark } from "@/components/seal-mark";
import { SiteNav, type NavItem } from "@/components/site-nav";
import { signOut } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth";

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
        // Sticky because this is the app's only navigation, and the history page --
        // the one you most want to leave -- is also the longest.
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
                        <>
                            {/* A rule, so "Đăng xuất" reads as an account action rather than
                  as a fourth place to go. */}
                            <span
                                aria-hidden
                                className="h-5 w-px shrink-0 bg-rule"
                            />

                            <div className="flex items-center gap-2">
                                {/* Below sm there is no room for a name. The role badge stays,
                    because it is the part that changes what you can do. */}
                                <span className="hidden max-w-[12ch] truncate text-sm text-ink-soft lg:inline">
                                    {user.profile.full_name ?? user.email}
                                </span>
                                <span
                                    className={`doc-ref shrink-0 ${
                                        isTeacher ? "text-lacquer" : ""
                                    }`}
                                >
                                    {isTeacher ? "Giáo viên" : "Học sinh"}
                                </span>

                                <form action={signOut}>
                                    <button
                                        type="submit"
                                        className="rounded-md px-2 py-1.5 text-sm text-ink-soft transition-colors hover:text-lacquer"
                                    >
                                        Đăng xuất
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="shrink-0 rounded-md border border-rule px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink"
                        >
                            Đăng nhập
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
