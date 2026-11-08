import { Field as BaseField } from "@base-ui/react/field";
import type { ReactNode } from "react";

/**
 * Groups a control with its label, description and error. Base UI wires the
 * ids, `aria-describedby` and `aria-invalid` from `invalid`.
 */
export function Field({
	invalid,
	children,
}: {
	invalid?: boolean;
	children: ReactNode;
}) {
	return (
		<BaseField.Root invalid={invalid} className="flex flex-col gap-1.5">
			{children}
		</BaseField.Root>
	);
}

export function FieldLabel({
	children,
	visuallyHidden = false,
}: {
	children: ReactNode;
	visuallyHidden?: boolean;
}) {
	return (
		<BaseField.Label
			className={visuallyHidden ? "sr-only" : "text-sm font-medium"}
		>
			{children}
		</BaseField.Label>
	);
}

export function FieldDescription({
	children,
	visuallyHidden = false,
}: {
	children: ReactNode;
	visuallyHidden?: boolean;
}) {
	return (
		<BaseField.Description
			className={
				visuallyHidden ? "sr-only" : "m-0 text-meta text-(--sea-ink-faint)"
			}
		>
			{children}
		</BaseField.Description>
	);
}

/** Shown and announced while the field is invalid. */
export function FieldError({ children }: { children: ReactNode }) {
	return (
		<BaseField.Error
			match
			aria-live="polite"
			className="m-0 text-meta font-medium text-(--danger)"
		>
			{children}
		</BaseField.Error>
	);
}
