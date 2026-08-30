import type { Citation } from "@/lib/db";

/**
 * Sources under an answer, rendered as document references.
 *
 * This is the signature element of the design and the reason to trust the
 * answer above it: the claim is that every fact came from an official document,
 * and this is where that claim is made checkable. Deliberately typographic
 * rather than card-like -- it should read as a footnote in a document, not as a
 * row of chips.
 */
export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-4 border-t border-rule pt-3">
      <p className="eyebrow">Trích từ</p>
      <ul className="mt-2 flex flex-col gap-2">
        {citations.map((citation, index) => (
          <li
            key={`${citation.documentId ?? citation.fileName}-${citation.page ?? index}`}
            className="border-l-2 border-lacquer pl-3"
          >
            <p className="doc-ref text-lacquer">
              {citation.fileName}
              {/* A missing page is simply not claimed. A wrong one would be
                  worse than none: a student who checks and finds nothing there
                  learns the assistant is unreliable. */}
              {citation.page !== null && ` · trang ${citation.page}`}
            </p>
            {citation.snippet && (
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {citation.snippet}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
