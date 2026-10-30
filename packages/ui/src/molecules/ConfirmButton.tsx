import type { ReactNode } from "react";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogPopup,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../atoms/AlertDialog";

export function ConfirmButton({
	children,
	title,
	description,
	confirmLabel,
	onConfirm,
	disabled,
}: {
	children: ReactNode;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	disabled?: boolean;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger disabled={disabled}>{children}</AlertDialogTrigger>
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
