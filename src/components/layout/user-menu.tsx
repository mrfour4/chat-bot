import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser }) {
    const isTeacher = user.profile.role === "teacher";

    return (
        <>
            {/* A rule, so "Đăng xuất" reads as an account action rather than as
                a fourth place to go. */}
            <Separator orientation="vertical" className="h-5" />

            <div className="flex items-center gap-2">
                {/* Below lg there is no room for a name. The role badge stays,
                    because it is the part that changes what you can do. */}
                <span className="hidden max-w-[12ch] truncate text-sm text-ink-soft lg:inline">
                    {user.profile.full_name ?? user.email}
                </span>
                <span
                    className={`doc-ref shrink-0 ${isTeacher ? "text-lacquer" : ""}`}
                >
                    {isTeacher ? "Giáo viên" : "Học sinh"}
                </span>

                <form action={signOut}>
                    <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-ink-soft hover:text-lacquer"
                    >
                        Đăng xuất
                    </Button>
                </form>
            </div>
        </>
    );
}
