import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText } from "@/components/chat/math-text";

const render = (text: string) =>
    renderToStaticMarkup(<MathText>{text}</MathText>);

describe("MathText", () => {
    it("renders the citation row from the report", () => {
        const html = render(
            "$\\ge50$ | $\\ge650$ | $\\underline{>}250$ | $>N3$",
        );

        expect(html).toContain('class="katex"');
        expect(html, "the delimiters reached the reader").not.toContain("$");

        expect(html).toContain("≥");
        expect(html).toContain("N3");
        expect(html).toContain(" | ");
    });

    it("leaves a plain quotation exactly as it was", () => {
        const quotation = "Điểm chuẩn ngành CNTT năm 2025 là 25,5 điểm.";
        expect(render(quotation)).toBe(quotation);
    });

    it("does not turn a quotation's own markup into formatting", () => {
        const html = render(
            "* mục một | # không phải tiêu đề | **giữ nguyên**",
        );

        expect(html).not.toContain("<li>");
        expect(html).not.toContain("<h1>");
        expect(html).not.toContain("<strong>");
    });

    it("does not throw on notation the document got wrong", () => {
        expect(() =>
            render("$\\frac{1}{$ và $\\notacommand{x}$"),
        ).not.toThrow();
    });
});
