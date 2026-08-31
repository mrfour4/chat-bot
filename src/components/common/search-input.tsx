"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

export function SearchInput({
    value,
    searching,
    placeholder,
    label,
    className,
    onChange,
}: {
    value: string;
    searching: boolean;
    placeholder: string;
    label: string;
    className?: string;
    onChange: (value: string) => void;
}) {
    const t = useTranslations("common");
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <InputGroup className={className}>
            <InputGroupAddon>
                <SearchIcon />
            </InputGroupAddon>

            <InputGroupInput
                ref={inputRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
                aria-busy={searching || undefined}
            />

            <InputGroupAddon align="inline-end">
                {searching && <Spinner />}

                {value.length > 0 && (
                    <InputGroupButton
                        size="icon-xs"
                        aria-label={t("clearSearch")}
                        onClick={() => {
                            onChange("");
                            // Clearing a search box and losing your place in the
                            // page is worse than having no button at all.
                            inputRef.current?.focus();
                        }}
                    >
                        <XIcon />
                    </InputGroupButton>
                )}
            </InputGroupAddon>
        </InputGroup>
    );
}
