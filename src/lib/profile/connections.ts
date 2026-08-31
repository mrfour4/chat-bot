import { cache } from "react";

import type { IdentitySummary } from "@/lib/profile/identities";
import { createClient } from "@/lib/supabase/server";

export const getIdentities = cache(async (): Promise<IdentitySummary[]> => {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUserIdentities();

        if (error || !data) return [];

        return data.identities.map((identity) => ({
            identity_id: identity.identity_id,
            provider: identity.provider,
        }));
    } catch {
        return [];
    }
});
