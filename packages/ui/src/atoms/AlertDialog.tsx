import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";
import { type ButtonVariant, buttonClassName } from "./Button";

export function AlertDialog({ children }: { children: ReactNode }) {
	return <BaseAlertDialog.Root>{children}</BaseAlertDialog.Root>;
}

export function AlertDialogTrigger({
	variant = "secondary",
	disabled,
	children,
}: {
	variant?: ButtonVariant;
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<BaseAlertDialog.Trigger
			className={buttonClassName(variant)}
			disabled={disabled}
		>
			{children}
		</BaseAlertDialog.Trigger>
	);
}

export function AlertDialogPopup({ children }: { children: ReactNode }) {
	return (
		<BaseAlertDialog.Portal>
			<BaseAlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
			<BaseAlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-lg border border-(--line) bg-(--surface-strong) p-5 shadow-lg outline-none">
				{children}
			</BaseAlertDialog.Popup>
		</BaseAlertDialog.Portal>
	);
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
	return (
		<BaseAlertDialog.Title className="m-0 text-base font-semibold tracking-tight text-(--sea-ink)">
			{children}
		</BaseAlertDialog.Title>
	);
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
	return (
		<BaseAlertDialog.Description className="m-0 text-sm text-(--sea-ink-soft)">
			{children}
		</BaseAlertDialog.Description>
	);
}

export function AlertDialogClose({
	variant = "secondary",
	onClick,
	children,
}: {
	variant?: ButtonVariant;
	onClick?: () => void;
	children: ReactNode;
}) {
	return (
		<BaseAlertDialog.Close
			className={buttonClassName(variant)}
			onClick={onClick}
		>
			{children}
		</BaseAlertDialog.Close>
	);
}
