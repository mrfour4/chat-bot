import type { ReactNode } from "react";

export function ProfileSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-lg border border-rule bg-surface p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                {title}
            </h2>
            {description && (
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {description}
                </p>
            )}
            <div className="mt-5">{children}</div>
        </section>
    );
}
