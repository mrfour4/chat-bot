import { useTranslations } from "next-intl";

export function AuthDivider() {
    const t = useTranslations("auth");

    return (
        <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-rule" />
            <span className="text-xs tracking-wide text-ink-soft uppercase">
                {t("or")}
            </span>
            <span className="h-px flex-1 bg-rule" />
        </div>
    );
}
