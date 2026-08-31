"use client";

import { useTranslations } from "next-intl";

import { MathText } from "@/components/chat/math-text";
import type { Citation } from "@/lib/db";

export function CitationEntry({ citation }: { citation: Citation }) {
    const t = useTranslations("chat");

    return (
        <li className="border-l-2 border-lacquer pl-3">
            <p className="doc-ref text-lacquer">
                {citation.fileName}
                {citation.page !== null &&
                    ` · ${t("page", { page: citation.page })}`}
            </p>
            {citation.snippet && (
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    <MathText>{citation.snippet}</MathText>
                </p>
            )}
        </li>
    );
}
