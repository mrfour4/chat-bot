import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const next = safeNextPath(searchParams.get("next"));
    const failure = searchParams.get("error");
    const code = searchParams.get("code");

    if (failure) {
        redirect(
            failure === "access_denied"
                ? "/login?error=oauth_cancelled"
                : "/login?error=oauth",
        );
    }

    if (!code) redirect("/login?error=oauth");

    let failed = false;

    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        failed = Boolean(error);
    } catch {
        failed = true;
    }

    if (failed) redirect("/login?error=oauth");

    revalidatePath("/", "layout");
    redirect(next);
}
