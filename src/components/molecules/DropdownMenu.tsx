import type { ReactNode, RefObject } from "react";

/**
 * A trigger with a panel that drops down below it, aligned right.
 * `header` gets its own section above the menu items in `children`.
 */
export function DropdownMenu({
	containerRef,
	trigger,
	open,
	header,
	children,
}: {
	containerRef?: RefObject<HTMLDivElement | null>;
	trigger: ReactNode;
	open: boolean;
	header?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div ref={containerRef} className="relative flex">
			{trigger}
			{open ? (
				<div className="absolute top-full right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-(--chip-line) bg-(--surface-strong) shadow-lg">
					{header ? (
						<div className="flex items-center gap-3 border-b border-(--line) p-3">
							{header}
						</div>
					) : null}
					<div className="flex flex-col gap-3 p-3">{children}</div>
				</div>
			) : null}
		</div>
	);
}
