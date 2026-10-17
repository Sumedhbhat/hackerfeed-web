import type { ReactNode } from "react";
import { Text } from "#/components/atoms/Text";

/** One connectable service in a list: name, status line, actions, and an optional error. */
export function ProviderRow({
	name,
	detail,
	actions,
	error,
}: {
	name: string;
	detail: ReactNode;
	actions: ReactNode;
	/** Shown under the row, announced to screen readers. */
	error?: ReactNode;
}) {
	return (
		<li aria-label={name} className="rounded-lg border border-(--line) p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<Text weight="semibold">{name}</Text>
					<Text tone="soft">{detail}</Text>
				</div>
				<div className="flex flex-wrap items-center gap-3">{actions}</div>
			</div>
			{error ? (
				<div className="mt-2">
					<Text role="alert">{error}</Text>
				</div>
			) : null}
		</li>
	);
}
