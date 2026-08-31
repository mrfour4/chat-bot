import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): string[] {
    return Object.entries(messages).flatMap(([key, value]) =>
        typeof value === "string"
            ? [`${prefix}${key}`]
            : flatten(value, `${prefix}${key}.`),
    );
}

function valueAt(messages: Messages, key: string): string {
    return key
        .split(".")
        .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)[part],
            messages,
        ) as string;
}

const BRANCHING_TYPES = new Set(["plural", "select", "selectordinal"]);

function icuArguments(message: string): Set<string> {
    const found = new Set<string>();

    let index = 0;
    while (index < message.length) {
        if (message[index] !== "{") {
            index += 1;
            continue;
        }

        const body = readBraced(message, index);
        index = body.end;

        const [name, type, rest] = splitArgument(body.text);
        if (!/^\w+$/.test(name)) continue;

        found.add(name);
        if (!BRANCHING_TYPES.has(type)) continue;

        for (const branch of branchBodies(rest)) {
            for (const nested of icuArguments(branch)) found.add(nested);
        }
    }

    return found;
}

function readBraced(text: string, open: number) {
    let depth = 0;
    for (let i = open; i < text.length; i += 1) {
        if (text[i] === "{") depth += 1;
        else if (text[i] === "}") {
            depth -= 1;
            if (depth === 0) {
                return { text: text.slice(open + 1, i), end: i + 1 };
            }
        }
    }
    return { text: text.slice(open + 1), end: text.length };
}

function splitArgument(body: string): [string, string, string] {
    const cuts: number[] = [];
    let depth = 0;

    for (let i = 0; i < body.length && cuts.length < 2; i += 1) {
        if (body[i] === "{") depth += 1;
        else if (body[i] === "}") depth -= 1;
        else if (body[i] === "," && depth === 0) cuts.push(i);
    }

    const name = body.slice(0, cuts[0] ?? body.length).trim();
    const type =
        cuts.length > 0
            ? body.slice(cuts[0] + 1, cuts[1] ?? body.length).trim()
            : "";
    const rest = cuts.length > 1 ? body.slice(cuts[1] + 1) : "";

    return [name, type, rest];
}

function branchBodies(branchList: string): string[] {
    const bodies: string[] = [];

    let index = 0;
    while (index < branchList.length) {
        if (branchList[index] !== "{") {
            index += 1;
            continue;
        }

        const body = readBraced(branchList, index);
        bodies.push(body.text);
        index = body.end;
    }

    return bodies;
}

describe("message catalogues", () => {
    const viKeys = flatten(vi as Messages).sort();
    const enKeys = flatten(en as Messages).sort();

    it("define exactly the same keys", () => {
        expect(enKeys).toEqual(viKeys);
    });

    it("leave no value empty", () => {
        const empty = viKeys.filter(
            (key) =>
                valueAt(vi as Messages, key).trim() === "" ||
                valueAt(en as Messages, key).trim() === "",
        );

        expect(empty).toEqual([]);
    });

    it("agree on which placeholders each message takes", () => {
        const placeholders = (messages: Messages, key: string) =>
            [...icuArguments(valueAt(messages, key))].sort();

        for (const key of viKeys) {
            expect(
                placeholders(en as Messages, key),
                `placeholders differ for ${key}`,
            ).toEqual(placeholders(vi as Messages, key));
        }
    });
});

describe("icuArguments", () => {
    it("reads a plain argument", () => {
        expect([...icuArguments("Xin chào {name}")]).toEqual(["name"]);
    });

    it("does not mistake a plural branch body for an argument", () => {
        expect([
            ...icuArguments(
                "{count, plural, =0 {Upload} other {Upload # files}}",
            ),
        ]).toEqual(["count"]);
    });

    it("still finds an argument nested inside a branch", () => {
        expect(
            [
                ...icuArguments(
                    "{count, plural, one {one file for {name}} other {# files}}",
                ),
            ].sort(),
        ).toEqual(["count", "name"]);
    });

    it("is not confused by a comma inside a branch", () => {
        expect([
            ...icuArguments("{n, plural, other {a, b, c and {who}}}"),
        ]).toEqual(["n", "who"]);
    });

    it("catches the case the whole test exists for", () => {
        expect([...icuArguments("Page {page} of {pageCount}")]).not.toEqual([
            ...icuArguments("Trang {page}"),
        ]);
    });
});
