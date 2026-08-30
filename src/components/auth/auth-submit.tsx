import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function AuthSubmit({
    canSubmit,
    submitting,
    children,
}: {
    canSubmit: boolean;
    submitting: boolean;
    children: string;
}) {
    return (
        <Button type="submit" disabled={!canSubmit} className="w-full">
            {submitting && <Spinner />}
            {submitting ? "Đang xử lý…" : children}
        </Button>
    );
}
