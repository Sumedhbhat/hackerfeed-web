import type { HTMLAttributes } from "react";

type TabListProps = Omit<HTMLAttributes<HTMLDivElement>, "className">;

export function TabList(props: TabListProps) {
	return (
		<div
			className="flex items-center gap-6 border-b border-(--line)"
			{...props}
		/>
	);
}
