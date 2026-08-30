import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "@/components/chat/markdown";

/**
 * No DOM here, and none needed: `renderToStaticMarkup` returns the HTML string
 * directly. What this suite proves is that the pipeline is wired -- the GFM
 * plugin is loaded, and raw HTML stays inert -- not that a list *looks* right,
 * which stays a job for the browser.
 */
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
        // The syntax itself must be gone, not merely styled.
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

        // Without remark-gfm this stays a paragraph of pipes.
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
        // The security property. `rehype-raw` is deliberately absent, so this is
        // structural rather than a filter that could be bypassed -- and a test that
        // fails loudly if someone adds the plugin for a formatting convenience.
        const html = render('Xin chào <img src=x onerror="alert(1)"> bạn');

        // Escaped into visible text, not dropped: the student sees exactly what
        // the model wrote, and the browser never sees an element.
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
