import { FileTextIcon } from "lucide-react";

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function DocumentsEmpty() {
    return (
        <Empty className="mt-10 border border-dashed border-rule">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileTextIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa có tài liệu nào</EmptyTitle>
                <EmptyDescription>
                    Tải lên thông báo tuyển sinh dạng PDF. Sau khi lập chỉ mục,
                    trợ lý sẽ dùng chính văn bản đó để trả lời học sinh.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
