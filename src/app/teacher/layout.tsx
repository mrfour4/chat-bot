import { requireTeacher } from "@/lib/auth";

export default async function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireTeacher();
    return <>{children}</>;
}
