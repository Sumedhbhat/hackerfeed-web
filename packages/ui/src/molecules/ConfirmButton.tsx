import type { ReactNode } from "react";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogPopup,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../atoms/AlertDialog";
import type { ButtonVariant } from "../atoms/Button";

export function ConfirmButton({
	children,
	title,
	description,
	confirmLabel,
	onConfirm,
	disabled,
	triggerLabel,
	variant,
}: {
	children: ReactNode;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	disabled?: boolean;
	/** The trigger's accessible name when its text alone is ambiguous, e.g. "Delete Sunset". */
	triggerLabel?: string;
	variant?: ButtonVariant;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger
				disabled={disabled}
				variant={variant}
				aria-label={triggerLabel}
			>
				{children}
			</AlertDialogTrigger>
			<AlertDialogPopup>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{description}</AlertDialogDescription>
				<div className="mt-4 flex justify-end gap-3">
					<AlertDialogClose>Cancel</AlertDialogClose>
					<AlertDialogClose variant="primary" onClick={onConfirm}>
						{confirmLabel}
					</AlertDialogClose>
				</div>
			</AlertDialogPopup>
		</AlertDialog>
	);
}
