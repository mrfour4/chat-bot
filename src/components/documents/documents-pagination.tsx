"use client";

import { useTranslations } from "next-intl";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export function DocumentsPagination({
    page,
    pageCount,
    total,
    onPageChange,
}: {
    page: number;
    pageCount: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    const t = useTranslations("documents");

    if (pageCount <= 1) return null;

    return (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="doc-ref">
                {t("pageOf", { page: page + 1, pageCount, total })}
            </p>

            <Pagination className="mx-0 w-auto">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            aria-disabled={page === 0}
                            onClick={() => page > 0 && onPageChange(page - 1)}
                            className={
                                page === 0
                                    ? "pointer-events-none opacity-50"
                                    : undefined
                            }
                        >
                            {t("previousPage")}
                        </PaginationPrevious>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext
                            aria-disabled={page + 1 >= pageCount}
                            onClick={() =>
                                page + 1 < pageCount && onPageChange(page + 1)
                            }
                            className={
                                page + 1 >= pageCount
                                    ? "pointer-events-none opacity-50"
                                    : undefined
                            }
                        >
                            {t("nextPage")}
                        </PaginationNext>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
