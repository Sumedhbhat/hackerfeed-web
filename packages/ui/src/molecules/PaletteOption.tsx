import type { ReactNode } from "react";
import { ToggleButton } from "../atoms/Toggle";

export function PaletteOptionList({
	children,
	...aria
}: {
	children: ReactNode;
	"aria-labelledby"?: string;
	"aria-label"?: string;
}) {
	return (
		<ul
			className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(11rem,100%),1fr))] gap-3 p-0"
			{...aria}
		>
			{children}
		</ul>
	);
}

/** One palette to pick: its swatch and name, with the owner's actions underneath. */
export function PaletteOption({
	name,
	selected,
	onSelect,
	swatch,
	actions,
}: {
	name: string;
	selected: boolean;
	onSelect: () => void;
	swatch: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<li className="flex min-w-0 flex-col gap-1">
			<ToggleButton
				variant="secondary"
				pressed={selected}
				onPressedChange={(pressed) => {
					if (pressed) onSelect();
				}}
			>
				{swatch}
				<span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
			</ToggleButton>
			{actions ? <div className="flex flex-wrap gap-1">{actions}</div> : null}
		</li>
	);
}
