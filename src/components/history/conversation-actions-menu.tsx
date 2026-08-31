"use client";

import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/components/common";
import { RenameConversationDialog } from "@/components/history/rename-conversation-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationSummary } from "@/lib/chat/conversations";

export type ConversationActions = {
    rename: (input: { id: string; title: string }) => void;
    remove: (id: string) => void;
};

export function ConversationActionsMenu({
    conversation,
    pending,
    actions,
}: {
    conversation: ConversationSummary;
    pending: boolean;
    actions: ConversationActions;
}) {
    const t = useTranslations("history");
    const [renaming, setRenaming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={pending}
                            aria-label={t("actionsLabel")}
                        >
                            <MoreHorizontalIcon />
                        </Button>
                    }
                />

                <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => setRenaming(true)}>
                            <PencilIcon data-icon="inline-start" />
                            {t("rename")}
                        </DropdownMenuItem>
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

            <RenameConversationDialog
                conversation={conversation}
                open={renaming}
                onOpenChange={setRenaming}
                pending={pending}
                onRename={actions.rename}
            />

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title={t("deleteTitle")}
                description={t("deleteDescription", {
                    count: conversation.messageCount,
                })}
                confirmLabel={t("deleteConfirm")}
                pending={pending}
                destructive
                onConfirm={() => {
                    actions.remove(conversation.id);
                    setDeleting(false);
                }}
            />
        </>
    );
}
