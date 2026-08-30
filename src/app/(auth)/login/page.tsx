import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Đăng nhập · Cố vấn Tuyển sinh" };

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string }>;
}) {
    if (await getSessionUser()) redirect("/");

    const { mode } = await searchParams;
    const isSignUp = mode === "signup";

    return (
        <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-[1fr_360px] md:py-24">
            <div className="max-w-md">
                <p className="eyebrow">Tài khoản</p>
                <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
                    {isSignUp
                        ? "Tạo tài khoản để lưu lịch sử hỏi đáp."
                        : "Đăng nhập để tiếp tục."}
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                    Bạn không cần tài khoản để đặt câu hỏi. Đăng nhập giúp học
                    sinh xem lại lịch sử trò chuyện, và cho phép giáo viên quản
                    lý tài liệu tuyển sinh.
                </p>

                <dl className="mt-8 space-y-3 border-t border-rule pt-6 text-sm">
                    <div className="flex gap-3">
                        <dt className="doc-ref w-20 shrink-0 self-start pt-1">
                            Khách
                        </dt>
                        <dd className="text-ink-soft">
                            Hỏi đáp, không lưu lịch sử.
                        </dd>
                    </div>
                    <div className="flex gap-3">
                        <dt className="doc-ref w-20 shrink-0 self-start pt-1">
                            Học sinh
                        </dt>
                        <dd className="text-ink-soft">
                            Hỏi đáp và xem lại lịch sử của mình.
                        </dd>
                    </div>
                    <div className="flex gap-3">
                        <dt className="doc-ref w-20 shrink-0 self-start pt-1">
                            Giáo viên
                        </dt>
                        <dd className="text-ink-soft">
                            Tải lên và quản lý tài liệu tuyển sinh. Quyền này do
                            quản trị viên cấp.
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="md:pt-11">
                {isSignUp ? <SignUpForm /> : <SignInForm />}
                <p className="mt-6 text-center text-sm text-ink-soft">
                    {isSignUp ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                    <Link
                        href={isSignUp ? "/login" : "/login?mode=signup"}
                        className="text-lacquer underline underline-offset-4"
                    >
                        {isSignUp ? "Đăng nhập" : "Tạo tài khoản"}
                    </Link>
                </p>
            </div>
        </div>
    );
}
