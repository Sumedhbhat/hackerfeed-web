import { type ReactNode, useId } from "react";
import { Kicker } from "../atoms/Kicker";
import { ToggleButton, ToggleGroup } from "../atoms/Toggle";

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
	const labelId = useId();
	return (
		<div className="flex flex-wrap gap-3 justify-between items-center mb-6 rise-in">
			<div className="flex gap-3 items-center">
				<span id={labelId}>
					<Kicker as="span">Sort by</Kicker>
				</span>
				<ToggleGroup
					value={value}
					onValueChange={onChange}
					aria-labelledby={labelId}
				>
					{options.map((option) => (
						<ToggleButton
							key={option.value}
							variant="secondary"
							value={option.value}
						>
							{option.label}
						</ToggleButton>
					))}
				</ToggleGroup>
			</div>
			{action}
		</div>
	);
}
