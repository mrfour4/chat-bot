import { afterEach, describe, expect, it, vi } from "vitest";

import { renderMath } from "@/lib/chat/katex";

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => warn.mockClear());

const LETTERS =
    "aăâbcdđeêghiklmnoôơpqrstuưvxy" +
    "áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩị" +
    "óòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ";

const VIETNAMESE = LETTERS + LETTERS.toUpperCase();

describe("renderMath", () => {
    it("measures every letter of the Vietnamese alphabet", () => {
        renderMath(`\\text{${VIETNAMESE}}`, false);

        expect(
            warn.mock.calls.map(([message]) => String(message)),
            "KaTeX has no metrics for these, so it lays them out as zero-sized",
        ).toEqual([]);
    });

    it("measures the characters from the report", () => {
        renderMath("\\text{ể} \\text{ộ}", false);
        expect(warn).not.toHaveBeenCalled();
    });

    it("does not disturb the letters KaTeX already renders", () => {
        renderMath("\\text{àéîõü Åžœ ĐđƠơƯư}", false);
        expect(warn).not.toHaveBeenCalled();
    });

    it("gives a diacritic room above and a dot room below", () => {
        const html = renderMath("\\text{ộ}", false);

        const height = /height:([\d.]+)em/.exec(html);
        expect(height, "no strut, so nothing was measured").toBeTruthy();
        expect(Number(height![1])).toBeGreaterThan(0.6);
    });

    it("still renders the notation itself", () => {
        const html = renderMath("\\text{THPT}_\\text{ĐT}", false);

        expect(html).toContain("<msub><mtext>THPT</mtext><mtext>ĐT</mtext>");
        expect(warn).not.toHaveBeenCalled();
    });

    it("does not throw on notation the model got wrong", () => {
        expect(() => renderMath("\\frac{1}{", false)).not.toThrow();
    });
});
