import { LibraryIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Asking against an empty store correctly refuses every question, which looks
 * like a broken assistant rather than an empty library. Say which it is before
 * the student spends a question finding out.
 */
export function EmptyLibraryNotice() {
    return (
        <Alert role="status" className="mb-6 border-pending/40 bg-panel">
            <LibraryIcon />
            <AlertTitle>Chưa có tài liệu tuyển sinh nào</AlertTitle>
            <AlertDescription>
                Trợ lý chưa thể trả lời câu hỏi nào. Vui lòng quay lại sau.
            </AlertDescription>
        </Alert>
    );
}
