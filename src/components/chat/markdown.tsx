import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an assistant answer.
 *
 * The model writes Markdown, so `whitespace-pre-wrap` was showing students
 * `* **Phương thức 1:**` where a bulleted list belonged.
 *
 * `react-markdown` builds React elements directly and ignores raw HTML unless
 * `rehype-raw` is added — which it deliberately is not. Model output therefore
 * cannot inject markup, rather than being filtered on the way in. It also
 * rewrites dangerous URL schemes (`javascript:`) out of links by default.
 *
 * Synchronous: only the `MarkdownHooks` export uses `useEffect`, so this one
 * component serves the client chat and the server-rendered history alike.
 */

/**
 * Headings are demoted. Every page here already owns its `h1`, and a model
 * that opens an answer with one would give the document two. `h1`–`h3` all
 * land on `h3`, sized to read as emphasis inside a message rather than as
 * page structure.
 */
const components: Components = {
    h1: ({ children }) => <h3 className="md-heading">{children}</h3>,
    h2: ({ children }) => <h3 className="md-heading">{children}</h3>,
    h3: ({ children }) => <h3 className="md-heading">{children}</h3>,
    h4: ({ children }) => <h4 className="md-heading">{children}</h4>,
    h5: ({ children }) => <h4 className="md-heading">{children}</h4>,
    h6: ({ children }) => <h4 className="md-heading">{children}</h4>,

    // An answer's link points at something a document mentioned; it should not
    // replace the conversation. `noopener` keeps the target away from
    // `window.opener`.
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

    // Admissions documents are full of tables — quotas by major, fee schedules.
    // The wrapper scrolls rather than letting a wide table stretch the message.
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

    // `inline` was dropped from the props in v9; a fenced block arrives wrapped
    // in <pre>, an inline span does not. Styling both here and letting <pre>
    // supply the block frame keeps the distinction without inspecting the node.
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
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {children}
            </ReactMarkdown>
        </div>
    );
}
