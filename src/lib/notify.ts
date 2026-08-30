import { toast } from "@/components/ui/toast";

/**
 * Mutation feedback, in one place.
 *
 * A wrapper rather than calling `toast.add` at each site: the two shapes below
 * are the only ones this app should produce, and going through them keeps a
 * success from arriving styled as an error because someone passed the wrong
 * `type` string.
 */
export function notifySuccess(title: string, description?: string) {
    toast.add({ title, description, type: "success" });
}

export function notifyError(title: string, description?: string) {
    toast.add({ title, description, type: "error" });
}
