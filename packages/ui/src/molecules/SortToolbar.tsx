import { type ReactNode, useId } from "react";
import { ToggleGroup, ToggleGroupItem } from "../atoms/Toggle";

type SortOption<T extends string> = { value: T; label: string };

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
	const labelId = useId();
	return (
		<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
			<div className="flex min-w-0 items-center gap-3">
				<span
					id={labelId}
					className="sr-only text-sm text-ink-soft sm:not-sr-only"
				>
					Sort by
				</span>
				<ToggleGroup
					layout="segmented"
					value={value}
					onValueChange={onChange}
					aria-labelledby={labelId}
				>
					{options.map((option) => (
						<ToggleGroupItem
							key={option.value}
							variant="segment"
							value={option.value}
						>
							{option.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
			{action}
		</div>
	);
}
