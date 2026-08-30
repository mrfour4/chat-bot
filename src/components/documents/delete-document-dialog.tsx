"use client";

import { useTranslations } from "next-intl";

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

export function DeleteDocumentDialog({
    document,
    pending,
    onConfirm,
}: {
    document: DocumentRow;
    pending: boolean;
    onConfirm: () => void;
}) {
    const t = useTranslations("documents");
    const tc = useTranslations("common");

    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label={t("deleteLabel", { title: document.title })}
                    >
                        {t("delete")}
                    </Button>
                }
            />

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("deleteTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("deleteDescription", { title: document.title })}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <DialogClose
                        render={
                            <Button variant="outline">{tc("cancel")}</Button>
                        }
                    />
                    <Button
                        variant="destructive"
                        disabled={pending}
                        onClick={onConfirm}
                    >
                        {pending && <Spinner />}
                        {pending ? t("deleting") : t("deleteConfirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
