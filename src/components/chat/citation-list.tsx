"use client";

import { ChevronRightIcon } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Citation } from "@/lib/db";

/**
 * Sources under an answer, rendered as document references.
 *
 * This is the signature element of the design and the reason to trust the
 * answer above it: the claim is that every fact came from an official document,
 * and this is where that claim is made checkable. Deliberately typographic
 * rather than card-like -- it should read as a footnote in a document, not as a
 * row of chips.
 *
 * Collapsed by default. The count stays visible when closed, so the evidence is
 * still *claimed* at a glance even when it is not being read.
 */
export function CitationList({ citations }: { citations: Citation[] }) {
    if (citations.length === 0) return null;

    return (
        <Collapsible className="mt-4 border-t border-rule pt-3">
            <CollapsibleTrigger className="doc-ref group flex cursor-pointer items-center gap-1 transition-colors hover:text-ink">
                <ChevronRightIcon
                    aria-hidden
                    className="size-3.5 transition-transform group-data-[panel-open]:rotate-90 motion-reduce:transition-none"
                />
                Trích từ {citations.length} nguồn
            </CollapsibleTrigger>

            <CollapsibleContent>
                <ul className="mt-3 flex flex-col gap-2">
                    {citations.map((citation, index) => (
                        <li
                            key={`${citation.documentId ?? citation.fileName}-${citation.page ?? index}`}
                            className="border-l-2 border-lacquer pl-3"
                        >
                            <p className="doc-ref text-lacquer">
                                {citation.fileName}
                                {/* A missing page is simply not claimed. A wrong one would be
                                    worse than none: a student who checks and finds nothing
                                    there learns the assistant is unreliable. */}
                                {citation.page !== null &&
                                    ` · trang ${citation.page}`}
                            </p>
                            {citation.snippet && (
                                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                                    {citation.snippet}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    );
}
