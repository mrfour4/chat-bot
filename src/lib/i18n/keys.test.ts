import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";

type Messages = { [key: string]: string | Messages };

const NAMESPACE =
    /\b(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([\w.]+)"\s*\)/g;

const ROOT_NAMESPACE =
    /\b(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*\)/g;

function sourceFiles(directory: string): string[] {
    return readdirSync(directory).flatMap((entry) => {
        const path = join(directory, entry);

        if (statSync(path).isDirectory()) return sourceFiles(path);
        if (!/\.tsx?$/.test(path)) return [];
        if (/\.test\.tsx?$|\.itest\.ts$/.test(path)) return [];

        return [path];
    });
}

function resolves(messages: Messages, key: string): boolean {
    const value = key
        .split(".")
        .reduce<unknown>(
            (node, part) =>
                node && typeof node === "object"
                    ? (node as Record<string, unknown>)[part]
                    : undefined,
            messages,
        );

    return typeof value === "string";
}

function usedKeys(): { file: string; keys: string[] }[] {
    const found: { file: string; keys: string[] }[] = [];

    for (const file of sourceFiles("src")) {
        const source = readFileSync(file, "utf8");
        const namespaces = new Map<string, string[]>();
        const bind = (variable: string, namespace: string) => {
            namespaces.set(variable, [
                ...(namespaces.get(variable) ?? []),
                namespace,
            ]);
        };

        for (const match of source.matchAll(NAMESPACE))
            bind(match[1], match[2]);
        for (const match of source.matchAll(ROOT_NAMESPACE)) bind(match[1], "");

        for (const [variable, bound] of namespaces) {
            const calls = new RegExp(`\\b${variable}\\(\\s*"([\\w.]+)"`, "g");

            for (const call of source.matchAll(calls)) {
                found.push({
                    file,
                    keys: bound.map((namespace) =>
                        namespace ? `${namespace}.${call[1]}` : call[1],
                    ),
                });
            }
        }
    }

    return found;
}

describe("translation keys used in the source", () => {
    const used = usedKeys();

    it("finds the calls at all", () => {
        expect(used.length).toBeGreaterThan(50);
    });

    it("all resolve in both catalogues", () => {
        const missing = used
            .filter(
                ({ keys }) =>
                    !keys.some(
                        (key) =>
                            resolves(vi as Messages, key) &&
                            resolves(en as Messages, key),
                    ),
            )
            .map(({ file, keys }) => `${keys.join(" | ")} (${file})`);

        expect(missing).toEqual([]);
    });
});
