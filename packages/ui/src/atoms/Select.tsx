import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

export type SelectOption = { value: string; label: string };

export function Select({
	value,
	options,
	onValueChange,
	disabled,
	children,
}: {
	value: string;
	options: SelectOption[];
	onValueChange: (value: string) => void;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<BaseSelect.Root
			value={value}
			items={options}
			disabled={disabled}
			onValueChange={(next) => {
				if (next != null) onValueChange(next);
			}}
		>
			{children}
		</BaseSelect.Root>
	);
}

export function SelectLabel({
	children,
	visuallyHidden = false,
}: {
	children: ReactNode;
	/** Name the field for screen readers only, when the context already says it. */
	visuallyHidden?: boolean;
}) {
	return (
		<BaseSelect.Label
			className={visuallyHidden ? "sr-only" : "text-sm text-(--sea-ink-soft)"}
		>
			{children}
		</BaseSelect.Label>
	);
}

export function SelectTrigger() {
	return (
		<BaseSelect.Trigger className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-(--field-line) bg-(--surface-strong) px-2.5 py-1 text-sm text-(--sea-ink) hover:bg-(--chip-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) data-disabled:cursor-not-allowed data-disabled:opacity-55">
			<BaseSelect.Value />
			<BaseSelect.Icon className="flex text-(--sea-ink-soft)">
				<ChevronsUpDown size={14} aria-hidden="true" />
			</BaseSelect.Icon>
		</BaseSelect.Trigger>
	);
}

export function SelectOptions({ options }: { options: SelectOption[] }) {
	return (
		<BaseSelect.Portal>
			<BaseSelect.Positioner className="z-50 outline-none" sideOffset={4}>
				<BaseSelect.Popup className="max-h-(--available-height) overflow-y-auto rounded-lg border border-(--line) bg-(--surface-strong) p-1 shadow-(--shadow-popup) outline-none">
					<BaseSelect.List>
						{options.map((option) => (
							<BaseSelect.Item
								key={option.value}
								value={option.value}
								className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md py-1.5 pr-4 pl-2 text-sm text-(--sea-ink) outline-none select-none data-highlighted:bg-(--chip-bg)"
							>
								<span className="flex w-3.5">
									<BaseSelect.ItemIndicator>
										<Check size={14} aria-hidden="true" />
									</BaseSelect.ItemIndicator>
								</span>
								<BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
							</BaseSelect.Item>
						))}
					</BaseSelect.List>
				</BaseSelect.Popup>
			</BaseSelect.Positioner>
		</BaseSelect.Portal>
	);
}
