import type { ReactNode } from "react";
import {
	Menu,
	MenuGroup,
	MenuPopup,
	MenuTrigger,
} from "#/components/atoms/Menu";

/**
 * A trigger with a panel that drops down below it, aligned right.
 * `header` gets its own section above the menu items in `children`.
 */
export function DropdownMenu({
	triggerLabel,
	trigger,
	header,
	children,
}: {
	triggerLabel: string;
	trigger: ReactNode;
	header?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Menu>
			<MenuTrigger aria-label={triggerLabel}>{trigger}</MenuTrigger>
			<MenuPopup>
				<MenuGroup label={header}>{children}</MenuGroup>
			</MenuPopup>
		</Menu>
	);
}
