"use client";

import { ImageIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import {
    removeAvatar,
    uploadAvatar,
    type ProfileFormState,
} from "@/app/profile/actions";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { notifyError, notifySuccess } from "@/lib/notify";
import { MAX_AVATAR_BYTES } from "@/lib/profile/avatar";

const ACCEPT = "image/png,image/jpeg,image/webp";

export function AvatarForm({
    src,
    fullName,
    email,
    stored,
    usingGooglePicture,
}: {
    src: string | null;
    fullName: string | null;
    email: string;
    stored: boolean;
    usingGooglePicture: boolean;
}) {
    const t = useTranslations("profile");
    const tCommon = useTranslations("common");
    const input = useRef<HTMLInputElement>(null);
    const [pending, startTransition] = useTransition();
    const [preview, setPreview] = useState<string | null>(null);

    function announce(outcome: ProfileFormState) {
        if (outcome.error) notifyError(t("failed"), outcome.error);
        if (outcome.notice) notifySuccess(outcome.notice);
    }

    function send(file: File) {
        const data = new FormData();
        data.set("avatar", file);
        startTransition(async () => {
            announce(await uploadAvatar(data));
            setPreview(null);
            if (input.current) input.current.value = "";
        });
    }

    function discard() {
        startTransition(async () => {
            announce(await removeAvatar());
            setPreview(null);
            if (input.current) input.current.value = "";
        });
    }

    return (
        <div className="flex flex-wrap items-center gap-5">
            <ProfileAvatar
                src={preview ?? src}
                fullName={fullName}
                email={email}
            />

            <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        ref={input}
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setPreview(URL.createObjectURL(file));
                            send(file);
                        }}
                    />

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => input.current?.click()}
                    >
                        {pending ? (
                            <Spinner />
                        ) : (
                            <ImageIcon data-icon="inline-start" />
                        )}
                        {pending ? tCommon("processing") : t("chooseImage")}
                    </Button>

                    {stored && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={discard}
                            className="text-ink-soft hover:text-lacquer"
                        >
                            <Trash2Icon data-icon="inline-start" />
                            {t("removeAvatar")}
                        </Button>
                    )}
                </div>

                <FieldDescription>
                    {usingGooglePicture
                        ? t("googlePictureInUse")
                        : t("avatarHelp", {
                              size: Math.round(MAX_AVATAR_BYTES / 1024 / 1024),
                          })}
                </FieldDescription>
            </div>
        </div>
    );
}
