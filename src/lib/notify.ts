import { toast } from "@/components/ui/toast";

export function notifySuccess(title: string, description?: string) {
    toast.add({ title, description, type: "success" });
}

export function notifyError(title: string, description?: string) {
    toast.add({ title, description, type: "error" });
}
