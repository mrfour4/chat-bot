"use client";

import { useTable } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import type { DocumentActions } from "@/components/documents/document-actions-menu";
import { DocumentsEmpty } from "@/components/documents/documents-empty";
import { DocumentsTableSkeleton } from "@/components/documents/documents-table-skeleton";
import {
    documentTableFeatures,
    useDocumentColumns,
} from "@/components/documents/use-document-columns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { DocumentListItem } from "@/lib/documents/repo";

const EMPTY_ROWS: DocumentListItem[] = [];

export function DocumentsTable({
    documents,
    loading,
    settling,
    filtered,
    pendingId,
    actions,
}: {
    documents: DocumentListItem[];
    loading: boolean;
    settling: boolean;
    filtered: boolean;
    pendingId: string | null;
    actions: DocumentActions;
}) {
    const t = useTranslations("documents");
    const columns = useDocumentColumns({ pendingId, actions });

    const table = useTable({
        features: documentTableFeatures,
        columns,
        data: documents.length > 0 ? documents : EMPTY_ROWS,
        getRowId: (row) => row.id,
    });

    const rows = table.getRowModel().rows;

    return (
        <div className="mt-6 overflow-x-auto rounded-lg border border-rule">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((group) => (
                        <TableRow key={group.id}>
                            {group.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : (
                                        <table.FlexRender header={header} />
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <DocumentsTableSkeleton rows={5} />
                    ) : rows.length === 0 && settling ? (
                        <DocumentsTableSkeleton rows={3} />
                    ) : rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="p-0">
                                <DocumentsEmpty filtered={filtered} />
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-busy={
                                    pendingId === row.id ? "" : undefined
                                }
                                className="data-busy:opacity-60"
                            >
                                {row.getAllCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        <table.FlexRender cell={cell} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <span className="sr-only" aria-live="polite">
                {t("rowCount", { count: rows.length })}
            </span>
        </div>
    );
}
