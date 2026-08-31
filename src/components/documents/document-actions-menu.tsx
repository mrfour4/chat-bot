"use client";

import {
    ArchiveIcon,
    ArchiveRestoreIcon,
    DownloadIcon,
    MoreHorizontalIcon,
    PencilIcon,
    RefreshCwIcon,
    Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/components/common";
import { RenameDocumentDialog } from "@/components/documents/rename-document-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentListItem } from "@/lib/documents/repo";
import { displayStatus } from "@/lib/documents/status";

export type DocumentActions = {
    rename: (input: { id: string; title: string }) => void;
    archive: (id: string) => void;
    restore: (id: string) => void;
    retry: (id: string) => void;
    remove: (id: string) => void;
};

export function DocumentActionsMenu({
    document,
    pending,
    actions,
}: {
    document: DocumentListItem;
    pending: boolean;
    actions: DocumentActions;
}) {
    const t = useTranslations("documents");
    const [renaming, setRenaming] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const status = displayStatus(document);
    const archived = status === "archived";
    const deleted = status === "deleted";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={deleted || pending}
                            aria-label={t("actionsLabel", {
                                title: document.title,
                            })}
                        >
                            <MoreHorizontalIcon />
                        </Button>
                    }
                />

                <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => setRenaming(true)}>
                            <PencilIcon data-icon="inline-start" />
                            {t("edit")}
                        </DropdownMenuItem>

                        {document.storage_path && (
                            <DropdownMenuItem
                                render={
                                    <a
                                        href={`/api/documents/${document.id}/file?download=1`}
                                    />
                                }
                            >
                                <DownloadIcon data-icon="inline-start" />
                                {t("download")}
                            </DropdownMenuItem>
                        )}

                        {status === "failed" && (
                            <DropdownMenuItem
                                onClick={() => actions.retry(document.id)}
                            >
                                <RefreshCwIcon data-icon="inline-start" />
                                {t("retry")}
                            </DropdownMenuItem>
                        )}

                        {archived ? (
                            <DropdownMenuItem
                                onClick={() => actions.restore(document.id)}
                            >
                                <ArchiveRestoreIcon data-icon="inline-start" />
                                {t("restore")}
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                onClick={() => setArchiving(true)}
                            >
                                <ArchiveIcon data-icon="inline-start" />
                                {t("archive")}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(true)}
                        >
                            <Trash2Icon data-icon="inline-start" />
                            {t("delete")}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <RenameDocumentDialog
                document={document}
                open={renaming}
                onOpenChange={setRenaming}
                pending={pending}
                onRename={actions.rename}
            />

            <ConfirmDialog
                open={archiving}
                onOpenChange={setArchiving}
                title={t("archiveTitle")}
                description={t("archiveDescription", {
                    title: document.title,
                })}
                confirmLabel={t("archiveConfirm")}
                pending={pending}
                onConfirm={() => {
                    actions.archive(document.id);
                    setArchiving(false);
                }}
            />

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title={t("deleteTitle")}
                description={t("deleteDescription", { title: document.title })}
                confirmLabel={t("deleteConfirm")}
                pending={pending}
                destructive
                onConfirm={() => {
                    actions.remove(document.id);
                    setDeleting(false);
                }}
            />
        </>
    );
}
