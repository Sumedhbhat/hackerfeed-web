import { Menu as BaseMenu } from "@base-ui/react/menu";
import { createLink } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { buttonClassName } from "./Button";

const ITEM_CLASSES =
	"flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-(--sea-ink-soft) no-underline outline-none select-none data-highlighted:bg-(--chip-bg) data-highlighted:text-(--sea-ink)";

export function Menu({ children }: { children: ReactNode }) {
	return <BaseMenu.Root>{children}</BaseMenu.Root>;
}

export function MenuTrigger({
	children,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	"aria-label": string;
}) {
	return (
		<BaseMenu.Trigger
			className={buttonClassName("icon")}
			aria-label={ariaLabel}
		>
			{children}
		</BaseMenu.Trigger>
	);
}

export function MenuPopup({ children }: { children: ReactNode }) {
	return (
		<BaseMenu.Portal>
			<BaseMenu.Positioner align="end" sideOffset={8} className="z-50">
				<BaseMenu.Popup className="w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-(--chip-line) bg-(--surface-strong) shadow-lg outline-none">
					{children}
				</BaseMenu.Popup>
			</BaseMenu.Positioner>
		</BaseMenu.Portal>
	);
}

export function MenuGroup({
	label,
	children,
}: {
	label?: ReactNode;
	children: ReactNode;
}) {
	return (
		<BaseMenu.Group>
			{label ? (
				<BaseMenu.GroupLabel className="flex items-center gap-3 border-b border-(--line) p-3">
					{label}
				</BaseMenu.GroupLabel>
			) : null}
			<div className="flex flex-col p-1.5">{children}</div>
		</BaseMenu.Group>
	);
}

export function MenuItem({
	onClick,
	children,
}: {
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<BaseMenu.Item className={ITEM_CLASSES} onClick={onClick}>
			{children}
		</BaseMenu.Item>
	);
}

type MenuAnchorProps = Omit<
	BaseMenu.LinkItem.Props,
	"className" | "style" | "render"
>;

function MenuAnchor(props: MenuAnchorProps) {
	return <BaseMenu.LinkItem closeOnClick className={ITEM_CLASSES} {...props} />;
}

export const MenuLinkItem = createLink(MenuAnchor);
