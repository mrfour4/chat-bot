"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { requestOrigin } from "@/lib/auth/request-origin";
import { PROFILE_PATH } from "@/lib/profile/paths";
import { createClient } from "@/lib/supabase/server";
import type { ProfileFormState } from "@/app/profile/actions";

export async function connectGoogle(): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");
    await requireUser();

    let authorizeUrl: string;

    try {
        const origin = await requestOrigin();
        if (!origin) return { error: t("saveFailed") };

        const callback = new URL("/auth/callback", origin);
        callback.searchParams.set("next", PROFILE_PATH);

        const supabase = await createClient();
        const { data, error } = await supabase.auth.linkIdentity({
            provider: "google",
            options: {
                redirectTo: callback.toString(),
                skipBrowserRedirect: true,
            },
        });

        if (error || !data.url) return { error: t("connectFailed") };

        authorizeUrl = data.url;
    } catch {
        return { error: t("connectFailed") };
    }

    redirect(authorizeUrl);
}

export async function disconnectGoogle(
    identityId: string,
): Promise<ProfileFormState> {
    const t = await getTranslations("serverProfile");
    await requireUser();

    const supabase = await createClient();
    const { data, error: listError } = await supabase.auth.getUserIdentities();

    if (listError || !data) return { error: t("disconnectFailed") };

    if (data.identities.length < 2) {
        return { error: t("disconnectLastIdentity") };
    }

    const identity = data.identities.find(
        (candidate) => candidate.identity_id === identityId,
    );

    if (!identity) return { error: t("disconnectFailed") };

    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) return { error: t("disconnectFailed") };

    revalidatePath(PROFILE_PATH);
    revalidatePath("/", "layout");
    return { notice: t("disconnected") };
}
