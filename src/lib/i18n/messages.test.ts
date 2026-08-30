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
        const placeholders = (messages: Messages, key: string) => [
            ...new Set(
                [...valueAt(messages, key).matchAll(/\{\s*(\w+)\s*[,}]/g)]
                    .map((match) => match[1])
                    .sort(),
            ),
        ];

        for (const key of viKeys) {
            expect(
                placeholders(en as Messages, key),
                `placeholders differ for ${key}`,
            ).toEqual(placeholders(vi as Messages, key));
        }
    });
});
