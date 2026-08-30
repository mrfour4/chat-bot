import { useTranslations } from "next-intl";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser }) {
    const t = useTranslations("nav");
    const isTeacher = user.profile.role === "teacher";

    return (
        <>
            <Separator orientation="vertical" className="h-5" />

            <div className="flex items-center gap-2">
                <span className="hidden max-w-[12ch] truncate text-sm text-ink-soft lg:inline">
                    {user.profile.full_name ?? user.email}
                </span>
                <span
                    className={`doc-ref shrink-0 ${isTeacher ? "text-lacquer" : ""}`}
                >
                    {isTeacher ? t("teacher") : t("student")}
                </span>

                <form action={signOut}>
                    <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-ink-soft hover:text-lacquer"
                    >
                        {t("signOut")}
                    </Button>
                </form>
            </div>
        </>
    );
}
