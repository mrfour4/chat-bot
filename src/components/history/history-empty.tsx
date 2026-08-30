import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

export function HistoryEmpty() {
    return (
        <Empty className="mt-10 border border-dashed border-rule">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <MessageSquareIcon />
                </EmptyMedia>
                <EmptyTitle>Chưa có câu hỏi nào</EmptyTitle>
                <EmptyDescription>
                    Câu hỏi bạn đặt khi đã đăng nhập sẽ được lưu lại ở đây.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button render={<Link href="/">Đặt câu hỏi</Link>} />
            </EmptyContent>
        </Empty>
    );
}
