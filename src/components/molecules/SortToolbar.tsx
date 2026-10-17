import type { ReactNode } from "react";
import { Button } from "#/components/atoms/Button";
import { Kicker } from "#/components/atoms/Kicker";

type SortOption<T extends string> = { value: T; label: string };

/** "Sort by" chips on the left, an extra action (e.g. "Clear") on the right. */
export function SortToolbar<T extends string>({
	options,
	value,
	onChange,
	action,
}: {
	options: readonly SortOption<T>[];
	value: T;
	onChange: (value: T) => void;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap gap-3 justify-between items-center mb-6 rise-in">
			<div className="flex gap-3 items-center">
				<Kicker as="span">Sort by</Kicker>
				<div className="flex gap-1">
					{options.map((option) => (
						<Button
							key={option.value}
							variant="secondary"
							onClick={() => onChange(option.value)}
							aria-pressed={value === option.value}
						>
							{option.label}
						</Button>
					))}
				</div>
			</div>
			{action}
		</div>
	);
}
