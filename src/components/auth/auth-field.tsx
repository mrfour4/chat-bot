"use client";

import type { AnyFieldApi } from "@tanstack/react-form";

import { useFieldErrors } from "@/hooks/use-field-errors";

import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AuthField({
    field,
    label,
    type,
    autoComplete,
    description,
}: {
    field: AnyFieldApi;
    label: string;
    type: string;
    autoComplete: string;
    description?: string;
}) {
    const translateErrors = useFieldErrors();
    const errors = field.state.meta.errors;
    const invalid = field.state.meta.isTouched && errors.length > 0;

    return (
        <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <Input
                id={field.name}
                name={field.name}
                type={type}
                autoComplete={autoComplete}
                value={field.state.value as string}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={invalid || undefined}
                className="h-9"
            />
            {description && !invalid && (
                <FieldDescription>{description}</FieldDescription>
            )}
            {invalid && <FieldError errors={translateErrors(errors)} />}
        </Field>
    );
}
