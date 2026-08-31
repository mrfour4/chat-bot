import { redirect } from "next/navigation";

import type { Profile } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
    id: string;
    email: string;
    profile: Profile;
    googlePicture: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!profile) return null;

        const metadata = user.user_metadata as {
            avatar_url?: unknown;
            picture?: unknown;
        };

        const picture =
            typeof metadata?.avatar_url === "string"
                ? metadata.avatar_url
                : typeof metadata?.picture === "string"
                  ? metadata.picture
                  : null;

        return {
            id: user.id,
            email: user.email ?? profile.email,
            profile,
            googlePicture: picture,
        };
    } catch {
        return null;
    }
}

export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
    const user = await getSessionUser();
    if (!user) redirect(redirectTo);
    return user;
}

export async function getTeacher(): Promise<SessionUser | null> {
    const user = await getSessionUser();
    return user?.profile.role === "teacher" ? user : null;
}

export async function requireTeacher(): Promise<SessionUser> {
    const user = await requireUser();
    if (user.profile.role !== "teacher") redirect("/?error=forbidden");
    return user;
}
