import { describe, expect, it } from "vitest";

import { splitMath } from "@/lib/chat/math";

const kinds = (text: string) =>
    splitMath(text).map((segment) =>
        segment.kind === "math"
            ? `${segment.display ? "display" : "math"}(${segment.value})`
            : `text(${segment.value})`,
    );

describe("splitMath", () => {
    it("splits the citation row from the report", () => {
        expect(
            kinds("$\\ge50$ | $\\ge650$ | $\\underline{>}250$ | $>N3$"),
        ).toEqual([
            "math(\\ge50)",
            "text( | )",
            "math(\\ge650)",
            "text( | )",
            "math(\\underline{>}250)",
            "text( | )",
            "math(>N3)",
        ]);
    });

    it("leaves text with no notation as one segment", () => {
        expect(kinds("Điểm chuẩn ngành CNTT là 25,5")).toEqual([
            "text(Điểm chuẩn ngành CNTT là 25,5)",
        ]);
    });

    it("keeps a lone dollar sign as text", () => {
        expect(kinds("khoảng 5 $ mỗi kỳ")).toEqual(["text(khoảng 5 $ mỗi kỳ)"]);
    });

    it("does not pair two prices into a formula", () => {
        expect(kinds("giá $5 và $10 một suất")).toEqual([
            "text(giá $5 và $10 một suất)",
        ]);
    });

    it("does not let inline notation span a line break", () => {
        expect(kinds("tổng $a\nb$ cuối")).toEqual(["text(tổng $a\nb$ cuối)"]);
    });

    it("reads display notation", () => {
        expect(kinds("trước $$\\frac{a}{b}$$ sau")).toEqual([
            "text(trước )",
            "display(\\frac{a}{b})",
            "text( sau)",
        ]);
    });

    it("unescapes an escaped dollar sign", () => {
        expect(kinds("chi phí 100\\$ một năm")).toEqual([
            "text(chi phí 100$ một năm)",
        ]);
    });

    it("ignores empty delimiters", () => {
        expect(kinds("a $$ b")).toEqual(["text(a $$ b)"]);
    });
});
