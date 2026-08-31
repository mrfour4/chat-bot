"use client";

import { useTranslations } from "next-intl";
import { useTransition, type ReactNode } from "react";

import type { ProfileFormState } from "@/app/profile/actions";
import {
    connectGoogle,
    disconnectGoogle,
} from "@/app/profile/identity-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Connection } from "@/lib/profile/identities";

export function ConnectionRow({
    label,
    mark,
    connection,
}: {
    label: string;
    mark: ReactNode;
    connection: Connection;
}) {
    const t = useTranslations("profile");
    const tCommon = useTranslations("common");
    const [pending, startTransition] = useTransition();

    function announce(outcome: ProfileFormState | undefined) {
        if (outcome?.error) notifyError(t("failed"), outcome.error);
        if (outcome?.notice) notifySuccess(outcome.notice);
    }

    function act() {
        startTransition(async () => {
            announce(
                connection.connected && connection.identityId
                    ? await disconnectGoogle(connection.identityId)
                    : await connectGoogle(),
            );
        });
    }

    const blocked = connection.connected && !connection.canDisconnect;

    const button = (
        <Button
            type="button"
            variant={connection.connected ? "ghost" : "outline"}
            size="sm"
            disabled={pending}
            onClick={act}
            className={blocked ? "pointer-events-none opacity-50" : undefined}
        >
            {pending && <Spinner />}
            {pending
                ? tCommon("processing")
                : connection.connected
                  ? t("disconnect")
                  : t("connect")}
        </Button>
    );

    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                {mark}
                <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{label}</p>
                    <Badge
                        variant={connection.connected ? "secondary" : "outline"}
                        className="mt-1"
                    >
                        {connection.connected
                            ? t("connected")
                            : t("notConnected")}
                    </Badge>
                </div>
            </div>

            {blocked ? (
                <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                        {button}
                    </TooltipTrigger>
                    <TooltipContent>
                        {t("disconnectLastIdentity")}
                    </TooltipContent>
                </Tooltip>
            ) : (
                button
            )}
        </div>
    );
}
