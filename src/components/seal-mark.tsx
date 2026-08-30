/**
 * The product mark: a red seal, the way an official announcement is validated.
 * Also used at small sizes to flag an answer that carries a citation.
 */
export function SealMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M16 8.5 L22 22 H10 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12.6 18.4h6.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
