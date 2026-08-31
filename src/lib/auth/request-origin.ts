import { headers } from "next/headers";

import { resolveOrigin } from "@/lib/auth/origin";
import { siteUrl } from "@/lib/env";

export async function requestOrigin(): Promise<string | null> {
    const list = await headers();

    return resolveOrigin({
        configured: siteUrl(),
        forwardedHost: list.get("x-forwarded-host"),
        forwardedProto: list.get("x-forwarded-proto"),
        host: list.get("host"),
    });
}
