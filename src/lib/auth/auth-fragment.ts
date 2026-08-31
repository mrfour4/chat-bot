export interface AuthFragment {
    accessToken: string | null;
    refreshToken: string | null;
    type: string | null;
    error: string | null;
}

export function parseAuthFragment(hash: string): AuthFragment | null {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;

    const params = new URLSearchParams(raw);

    const failure = params.get("error");
    if (failure) {
        return {
            accessToken: null,
            refreshToken: null,
            type: null,
            error: params.get("error_code") ?? failure,
        };
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return null;

    return {
        accessToken,
        refreshToken,
        type: params.get("type"),
        error: null,
    };
}
