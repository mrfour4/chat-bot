import { requireTeacher } from "@/lib/auth";

/**
 * Every /teacher route is teacher-only. This guard is the redirect for a good
 * user experience; RLS on the documents table is the actual enforcement.
 */
export default async function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireTeacher();
    return <>{children}</>;
}
