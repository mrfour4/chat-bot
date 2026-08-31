"use client";

import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { DocumentActionsMenu } from "@/components/documents/document-actions-menu";
import type { DocumentActions } from "@/components/documents/document-actions-menu";
import { DocumentNameCell } from "@/components/documents/document-name-cell";
import { DocumentPeopleCell } from "@/components/documents/document-people-cell";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import type { DocumentListItem } from "@/lib/documents/repo";
import { displayStatus } from "@/lib/documents/status";

export const documentTableFeatures = tableFeatures({});

const helper = createColumnHelper<
    typeof documentTableFeatures,
    DocumentListItem
>();

export function useDocumentColumns(input: {
    pendingId: string | null;
    actions: DocumentActions;
}) {
    const t = useTranslations("documents");

    return useMemo(
        () =>
            helper.columns([
                helper.accessor("title", {
                    header: () => t("columnName"),
                    cell: ({ row }) => (
                        <DocumentNameCell document={row.original} />
                    ),
                }),
                helper.accessor("uploaded_by", {
                    header: () => t("columnUploadedBy"),
                    cell: ({ row }) => (
                        <DocumentPeopleCell
                            uploader={row.original.uploader}
                            editor={row.original.editor}
                        />
                    ),
                }),
                helper.accessor("status", {
                    header: () => t("columnStatus"),
                    cell: ({ row }) => (
                        <DocumentStatusBadge
                            status={displayStatus(row.original)}
                        />
                    ),
                }),
                helper.display({
                    id: "actions",
                    header: () => (
                        <span className="sr-only">{t("columnActions")}</span>
                    ),
                    cell: ({ row }) => (
                        <DocumentActionsMenu
                            document={row.original}
                            pending={input.pendingId === row.original.id}
                            actions={input.actions}
                        />
                    ),
                }),
            ]),
        [t, input.pendingId, input.actions],
    );
}
