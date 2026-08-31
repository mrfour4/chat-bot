const HOST = /^[a-z0-9.-]+(?::\d{1,5})?$/i;

const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];

export interface OriginSource {
    configured?: string | null;
    forwardedHost?: string | null;
    forwardedProto?: string | null;
    host?: string | null;
}

function first(value: string | null | undefined): string | null {
    const head = value?.split(",")[0]?.trim();
    return head ? head : null;
}

function isLoopback(host: string): boolean {
    const name = host.split(":")[0]?.toLowerCase() ?? "";
    return LOOPBACK.includes(name);
}

function origin(host: string | null, proto: string | null): string | null {
    if (!host || !HOST.test(host)) return null;
    const scheme = proto ?? (isLoopback(host) ? "http" : "https");
    return `${scheme}://${host}`;
}

export function resolveOrigin(source: OriginSource): string | null {
    const configured = source.configured?.trim();
    if (configured) return configured.replace(/\/+$/, "");

    const forwarded = origin(
        first(source.forwardedHost),
        first(source.forwardedProto),
    );
    if (forwarded) return forwarded;

    return origin(first(source.host), null);
}
