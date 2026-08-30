import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function ChatError({ message }: { message: string }) {
    return (
        <Alert variant="destructive" className="mb-3">
            <TriangleAlertIcon />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}
