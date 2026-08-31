"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { avatarPath, validateAvatar } from "@/lib/profile/avatar";
import { PROFILE_PATH } from "@/lib/profile/paths";
import { createClient } from "@/lib/supabase/server";
import { displayNameSchema } from "@/lib/validation/profile";

export interface ProfileFormState {
    error?: string;
    notice?: string;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function updateDisplayName(
    input: unknown,
): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");

    const parsed = displayNameSchema.safeParse(input);
    if (!parsed.success) return { error: t("nameInvalid") };

    const user = await requireUser();
    const supabase = await createClient();

    const { error } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.fullName || null })
        .eq("id", user.id);

    if (error) return { error: t("saveFailed") };

    revalidatePath(PROFILE_PATH);
    revalidatePath("/", "layout");
    return { notice: t("nameSaved") };
}

export async function uploadAvatar(
    formData: FormData,
): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");

    const file = formData.get("avatar");
    if (!(file instanceof File)) return { error: t("avatarMissing") };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateAvatar({ mimeType: file.type, bytes });

    if (!check.ok) {
        return {
            error: t(
                check.code === "empty"
                    ? "avatarEmpty"
                    : check.code === "too-large"
                      ? "avatarTooLarge"
                      : "avatarNotAnImage",
            ),
        };
    }

    const user = await requireUser();
    const supabase = await createClient();
    const path = avatarPath(user.id, check.extension);

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, bytes, { contentType: check.mimeType, upsert: true });

    if (uploadError) return { error: t("avatarUploadFailed") };

    const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);

    if (error) return { error: t("saveFailed") };

    await discardOtherAvatars(supabase, user.id, path);

    revalidatePath(PROFILE_PATH);
    revalidatePath("/", "layout");
    return { notice: t("avatarSaved") };
}

async function discardOtherAvatars(
    supabase: ServerClient,
    userId: string,
    keep: string,
): Promise<void> {
    const { data } = await supabase.storage.from("avatars").list(userId);
    if (!data) return;

    const stale = data
        .map((entry) => `${userId}/${entry.name}`)
        .filter((path) => path !== keep);

    if (stale.length > 0) {
        await supabase.storage.from("avatars").remove(stale);
    }
}

export async function removeAvatar(): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");
    const user = await requireUser();
    const supabase = await createClient();

    const { data } = await supabase.storage.from("avatars").list(user.id);

    if (data && data.length > 0) {
        await supabase.storage
            .from("avatars")
            .remove(data.map((entry) => `${user.id}/${entry.name}`));
    }

    const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

    if (error) return { error: t("saveFailed") };

    revalidatePath(PROFILE_PATH);
    revalidatePath("/", "layout");
    return { notice: t("avatarRemoved") };
}
