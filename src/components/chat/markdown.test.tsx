import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "@/components/chat/markdown";

function render(markdown: string) {
    return renderToStaticMarkup(<Markdown>{markdown}</Markdown>);
}

describe("Markdown", () => {
    it("renders the exact answer shape that prompted this phase", () => {
        const html = render(
            "* **Phương thức 1:** Tuyển thẳng theo quy chế tuyển sinh đại học.",
        );

        expect(html).toContain("<li>");
        expect(html).toContain("<strong>Phương thức 1:</strong>");

        expect(html).not.toContain("* **");
    });

    it("renders numbered lists as ordered lists", () => {
        const html = render("1. Đăng ký\n2. Nộp hồ sơ");

        expect(html).toContain("<ol>");
        expect(html).toContain("Đăng ký");
    });

    it("renders GFM tables, which admissions documents are full of", () => {
        const html = render(
            ["| Ngành | Chỉ tiêu |", "| --- | --- |", "| CNTT | 120 |"].join(
                "\n",
            ),
        );

        expect(html).toContain("<table");
        expect(html).toContain("<th");
        expect(html).toContain("120");
    });

    it("opens links in a new tab without handing over window.opener", () => {
        const html = render("[Xem thông báo](https://example.edu/ts2025)");

        expect(html).toContain('href="https://example.edu/ts2025"');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
    });

    it("does not render raw HTML from model output", () => {
        const html = render('Xin chào <img src=x onerror="alert(1)"> bạn');

        expect(html).not.toContain("<img");
        expect(html).toContain("&lt;img");
    });

    it("strips javascript: URLs", () => {
        const html = render("[bấm vào đây](javascript:alert(1))");

        expect(html).not.toContain("javascript:");
    });

    it("demotes model headings so the page keeps one h1", () => {
        const html = render("# Phương thức xét tuyển");

        expect(html).not.toContain("<h1");
        expect(html).toContain("<h3");
    });

    it("keeps inline code distinct from a fenced block", () => {
        expect(render("Mã trường là `QSC`.")).toContain("<code");
        expect(render("```\nQSC\n```")).toContain("<pre");
    });
});

describe("Markdown with mathematical notation", () => {
    it("renders the inline notation that prompted this phase", () => {
        const html = render(
            "**$\\text{THPT}_\\text{ĐT}$:** Điểm thi tốt nghiệp",
        );

        expect(html).toContain('class="katex"');

        expect(html).toContain("<msub><mtext>THPT</mtext><mtext>ĐT</mtext>");

        expect(html, "the dollar delimiters reached the reader").not.toContain(
            "$",
        );
    });

    it("renders display notation as its own block", () => {
        expect(render("$$\n\\frac{a}{b}\n$$")).toContain("katex-display");
    });

    it("leaves an unmatched dollar sign as text", () => {
        expect(render("Học phí 5 triệu $ mỗi kỳ")).toContain(
            "Học phí 5 triệu $ mỗi kỳ",
        );
    });

    it("does not throw on notation the model got wrong", () => {
        expect(() => render("$\\frac{1}{$")).not.toThrow();
        expect(() => render("$\\notacommand{x}$")).not.toThrow();
    });
});
