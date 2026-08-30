import { LockIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * `requireTeacher()` redirects here when a student opens a teacher link.
 * Without this the bounce is silent, and the student is left thinking the page
 * is broken rather than not theirs.
 */
export function ForbiddenNotice() {
    return (
        <Alert role="status" className="mb-8 border-pending/40 bg-panel">
            <LockIcon />
            <AlertTitle>Trang này chỉ dành cho giáo viên</AlertTitle>
            <AlertDescription>
                Bạn vẫn có thể đặt câu hỏi về tuyển sinh ở ngay bên dưới.
            </AlertDescription>
        </Alert>
    );
}
