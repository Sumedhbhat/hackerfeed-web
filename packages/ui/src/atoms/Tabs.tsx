import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

const TAB_CLASSES =
	"inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-1 text-sm font-medium text-(--sea-ink-soft) transition-colors hover:text-(--sea-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lagoon) data-active:bg-(--surface-strong) data-active:text-(--sea-ink) data-active:shadow-(--shadow-raised)";

export function Tabs<T extends string>({
	value,
	onValueChange,
	children,
}: {
	value: T;
	onValueChange: (value: T) => void;
	children: ReactNode;
}) {
	return (
		<BaseTabs.Root
			value={value}
			onValueChange={(next: T) => onValueChange(next)}
		>
			{children}
		</BaseTabs.Root>
	);
}

export function TabList({
	children,
	activateOnFocus = false,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	activateOnFocus?: boolean;
	"aria-label": string;
}) {
	return (
		<BaseTabs.List
			activateOnFocus={activateOnFocus}
			aria-label={ariaLabel}
			className="inline-flex max-w-full items-center gap-1 self-start overflow-x-auto rounded-lg border border-(--line) bg-(--chip-bg) p-1"
		>
			{children}
		</BaseTabs.List>
	);
}

export function Tab({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}) {
	return (
		<BaseTabs.Tab value={value} className={TAB_CLASSES}>
			{children}
		</BaseTabs.Tab>
	);
}

export function TabPanel({
	value,
	keepMounted = false,
	children,
}: {
	value: string;
	keepMounted?: boolean;
	children: ReactNode;
}) {
	return (
		// Panels always hold links or buttons, so the panel itself is not a tab stop.
		<BaseTabs.Panel value={value} keepMounted={keepMounted} tabIndex={-1}>
			{children}
		</BaseTabs.Panel>
	);
}
