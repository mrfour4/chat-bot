export type MathSegment =
    | { kind: "text"; value: string }
    | { kind: "math"; value: string; display: boolean };

export function splitMath(text: string): MathSegment[] {
    const segments: MathSegment[] = [];
    let plain = "";
    let index = 0;

    const flush = () => {
        if (plain !== "") segments.push({ kind: "text", value: plain });
        plain = "";
    };

    while (index < text.length) {
        if (text[index] === "\\" && text[index + 1] === "$") {
            plain += "$";
            index += 2;
            continue;
        }

        if (text[index] !== "$") {
            plain += text[index];
            index += 1;
            continue;
        }

        const display = text[index + 1] === "$";
        const fence = display ? "$$" : "$";
        const from = index + fence.length;
        const close = text.indexOf(fence, from);
        const tex = close === -1 ? "" : text.slice(from, close);

        if (!isFormula(tex, display)) {
            plain += text[index];
            index += 1;
            continue;
        }

        flush();
        segments.push({ kind: "math", value: tex, display });
        index = close + fence.length;
    }

    flush();
    return segments;
}

function isFormula(tex: string, display: boolean): boolean {
    if (tex.trim() === "") return false;
    if (display) return true;

    return !/^\s|\s$|\n/.test(tex);
}
