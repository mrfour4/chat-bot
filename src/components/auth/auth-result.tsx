import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import type { AuthFormState } from "@/app/(auth)/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AuthResult({ result }: { result: AuthFormState }) {
    if (result.error) {
        return (
            <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{result.error}</AlertDescription>
            </Alert>
        );
    }

    if (result.notice) {
        return (
            <Alert>
                <CircleCheckIcon />
                <AlertDescription>{result.notice}</AlertDescription>
            </Alert>
        );
    }

    return null;
}
