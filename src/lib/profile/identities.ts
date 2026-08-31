export interface IdentitySummary {
    identity_id: string;
    provider: string;
}

export interface Connection {
    connected: boolean;
    identityId: string | null;
    canDisconnect: boolean;
    blockedReason: "lastIdentity" | null;
}

export function hasPassword(identities: IdentitySummary[]): boolean {
    return identities.some((identity) => identity.provider === "email");
}

export function describeConnections(identities: IdentitySummary[]): {
    google: Connection;
} {
    const google = identities.find(
        (identity) => identity.provider === "google",
    );

    if (!google) {
        return {
            google: {
                connected: false,
                identityId: null,
                canDisconnect: false,
                blockedReason: null,
            },
        };
    }

    const lastWayIn = identities.length < 2;

    return {
        google: {
            connected: true,
            identityId: google.identity_id,
            canDisconnect: !lastWayIn,
            blockedReason: lastWayIn ? "lastIdentity" : null,
        },
    };
}

export function initials(
    fullName: string | null | undefined,
    email: string,
): string {
    const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);

    if (words.length > 1) {
        const first = words[0]![0]!;
        const last = words[words.length - 1]![0]!;
        return (first + last).toUpperCase();
    }

    if (words.length === 1) return words[0]![0]!.toUpperCase();

    const letter = email.trim()[0];
    return letter ? letter.toUpperCase() : "?";
}
