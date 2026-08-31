import { renderMath } from "@/lib/chat/katex";
import { splitMath } from "@/lib/chat/math";

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
                            __html: renderMath(segment.value, segment.display),
                        }}
                    />
                ),
            )}
        </>
    );
}
