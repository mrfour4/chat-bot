import Link from "next/link";

import { SealMark } from "@/components/seal-mark";
import { signOut } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const isTeacher = user?.profile.role === "teacher";

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-2.5 text-lacquer">
          <SealMark size={26} />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Cố vấn Tuyển sinh
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {user && (
            <Link
              href="/history"
              className="rounded-md px-3 py-1.5 text-ink-soft transition-colors hover:bg-panel hover:text-ink"
            >
              Lịch sử
            </Link>
          )}

          {isTeacher && (
            <Link
              href="/teacher/documents"
              className="rounded-md px-3 py-1.5 text-ink-soft transition-colors hover:bg-panel hover:text-ink"
            >
              Tài liệu
            </Link>
          )}

          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-ink-soft transition-colors hover:bg-panel hover:text-ink"
              >
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-rule px-3 py-1.5 text-ink transition-colors hover:border-ink"
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
