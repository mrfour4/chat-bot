import katex from "katex";
import fontMetricsData from "katex/src/fontMetricsData.js";

type MetricsTuple = [number, number, number, number, number];

type FontMetrics = Record<number, MetricsTuple>;

const internals = katex as unknown as {
    __setFontMetrics: (font: string, metrics: FontMetrics) => void;
};

const LATIN_EXTENDED_ADDITIONAL: readonly [number, number] = [0x1e00, 0x1eff];

const BELOW_MARKS = new Set([0x0323, 0x0326, 0x0327, 0x0328, 0x0331]);

const CAPITAL = "M".charCodeAt(0);

const DESCENDER = "y".charCodeAt(0);

export const KATEX_OPTIONS = {
    throwOnError: false,
    strict: "ignore" as const,
    trust: false,
};

function derive(
    metrics: FontMetrics,
    code: number,
    capital: MetricsTuple,
    descender: MetricsTuple,
): MetricsTuple | null {
    const decomposed = String.fromCodePoint(code).normalize("NFD");
    const marks = [...decomposed].slice(1).map((mark) => mark.codePointAt(0)!);

    if (marks.length === 0) return null;

    const base = metrics[decomposed.codePointAt(0)!];
    if (!base) return null;

    const below = marks.some((mark) => BELOW_MARKS.has(mark));
    const above = marks.some((mark) => !BELOW_MARKS.has(mark));

    return [
        below ? Math.max(base[0], descender[0]) : base[0],
        above ? Math.max(base[1], capital[1]) : base[1],
        base[2],
        base[3],
        base[4],
    ];
}

function extendLatinMetrics(): void {
    for (const [font, table] of Object.entries(
        fontMetricsData as unknown as Record<string, FontMetrics>,
    )) {
        const capital = table[CAPITAL];
        const descender = table[DESCENDER];
        if (!capital || !descender) continue;

        const added: FontMetrics = {};

        const [from, to] = LATIN_EXTENDED_ADDITIONAL;

        for (let code = from; code <= to; code += 1) {
            if (table[code]) continue;

            const metrics = derive(table, code, capital, descender);
            if (metrics) added[code] = metrics;
        }

        if (Object.keys(added).length > 0) {
            internals.__setFontMetrics(font, { ...table, ...added });
        }
    }
}

extendLatinMetrics();

export function renderMath(tex: string, display: boolean): string {
    return katex.renderToString(tex, {
        ...KATEX_OPTIONS,
        displayMode: display,
    });
}
