import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CitationEntry } from "@/components/chat/citation-entry";
import messages from "../../../messages/vi.json";
import type { Citation } from "@/lib/db";

function render(snippet: string | null) {
    const citation: Citation = {
        documentId: "doc-1",
        fileName: "de-an-tuyen-sinh.pdf",
        page: 3,
        snippet,
    };

    return renderToStaticMarkup(
        <NextIntlClientProvider
            locale="vi"
            messages={messages}
            timeZone="Asia/Ho_Chi_Minh"
        >
            <CitationEntry citation={citation} />
        </NextIntlClientProvider>,
    );
}

describe("CitationEntry", () => {
    it("renders notation in the snippet", () => {
        const html = render(
            "$\\ge50$ | $\\ge650$ | $\\underline{>}250$ | $>N3$",
        );

        expect(html, "the snippet is rendered as plain text").toContain(
            'class="katex"',
        );
        expect(html).not.toContain("\\ge50$");
        expect(html).toContain(" | ");
    });

    it("leaves a snippet with no notation as it was written", () => {
        const html = render("Điểm chuẩn năm 2025 là 25,5 điểm.");

        expect(html).toContain("Điểm chuẩn năm 2025 là 25,5 điểm.");
        expect(html).not.toContain("katex");
    });

    it("names the document and page it came from", () => {
        const html = render(null);

        expect(html).toContain("de-an-tuyen-sinh.pdf");
        expect(html).toContain("3");
    });
});
