import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { KATEX_OPTIONS } from "@/lib/chat/katex";

const components: Components = {
    h1: ({ children }) => <h3 className="md-heading">{children}</h3>,
    h2: ({ children }) => <h3 className="md-heading">{children}</h3>,
    h3: ({ children }) => <h3 className="md-heading">{children}</h3>,
    h4: ({ children }) => <h4 className="md-heading">{children}</h4>,
    h5: ({ children }) => <h4 className="md-heading">{children}</h4>,
    h6: ({ children }) => <h4 className="md-heading">{children}</h4>,

    a: ({ children, href }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lacquer underline underline-offset-2 hover:no-underline"
        >
            {children}
        </a>
    ),

    table: ({ children }) => (
        <div className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
                {children}
            </table>
        </div>
    ),
    th: ({ children }) => (
        <th className="border border-rule bg-panel px-2.5 py-1.5 font-medium">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="border border-rule px-2.5 py-1.5 align-top">
            {children}
        </td>
    ),

    code: ({ children, className }) => (
        <code
            className={
                className
                    ? "font-mono text-[13px]"
                    : "rounded bg-panel px-1 py-0.5 font-mono text-[0.9em]"
            }
        >
            {children}
        </code>
    ),
    pre: ({ children }) => (
        <pre className="my-3 overflow-x-auto rounded-md border border-rule bg-panel p-3">
            {children}
        </pre>
    ),
};

export function Markdown({ children }: { children: string }) {
    return (
        <div className="markdown text-sm leading-relaxed">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
                components={components}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
