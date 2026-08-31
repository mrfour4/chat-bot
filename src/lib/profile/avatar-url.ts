import { cache } from "react";

import type { SessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const avatarUrl = cache(
    async (user: SessionUser): Promise<string | null> => {
        const path = user.profile.avatar_url;

        if (!path) return user.googlePicture;

        const supabase = await createClient();
        const { data } = await supabase.storage
            .from("avatars")
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

        return data?.signedUrl ?? user.googlePicture;
    },
);
