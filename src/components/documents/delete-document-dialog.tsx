"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { DocumentRow } from "@/lib/db";

/**
 * Deleting is irreversible and removes the document from the assistant's
 * knowledge, so it is confirmed rather than done on one click. A dialog rather
 * than `window.confirm`, which browsers let users suppress permanently --
 * silently turning a destructive action into a single click.
 */
export function DeleteDocumentDialog({
    document,
    pending,
    onConfirm,
}: {
    document: DocumentRow;
    pending: boolean;
    onConfirm: () => void;
}) {
    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Xoá ${document.title}`}
                    >
                        Xoá
                    </Button>
                }
            />

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Xoá tài liệu này?</DialogTitle>
                    <DialogDescription>
                        “{document.title}” sẽ bị xoá khỏi danh sách và khỏi chỉ
                        mục của trợ lý. Học sinh sẽ không còn nhận được câu trả
                        lời trích từ tài liệu này.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <DialogClose
                        render={<Button variant="outline">Huỷ</Button>}
                    />
                    <Button
                        variant="destructive"
                        disabled={pending}
                        onClick={onConfirm}
                    >
                        {pending && <Spinner />}
                        {pending ? "Đang xoá…" : "Xoá tài liệu"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
