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
            <circle
                cx="16"
                cy="16"
                r="14.5"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <circle
                cx="16"
                cy="16"
                r="10.75"
                stroke="currentColor"
                strokeWidth="0.75"
                opacity="0.45"
            />
            <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M11.75 12.75h8.5" />
                <path d="M11.75 16h8.5" />
                <path d="M11.75 19.25h5" />
            </g>
        </svg>
    );
}
