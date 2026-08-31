import katex from "katex";

import { splitMath } from "@/lib/chat/math";

const KATEX_OPTIONS = {
    throwOnError: false,
    strict: "ignore" as const,
    trust: false,
};

export function MathText({ children }: { children: string }) {
    const segments = splitMath(children);

    if (segments.every((segment) => segment.kind === "text")) {
        return <>{children}</>;
    }

    return (
        <>
            {segments.map((segment, index) =>
                segment.kind === "text" ? (
                    <span key={index}>{segment.value}</span>
                ) : (
                    <span
                        key={index}
                        dangerouslySetInnerHTML={{
                            __html: katex.renderToString(segment.value, {
                                ...KATEX_OPTIONS,
                                displayMode: segment.display,
                            }),
                        }}
                    />
                ),
            )}
        </>
    );
}
