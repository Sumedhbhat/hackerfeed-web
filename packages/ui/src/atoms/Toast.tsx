import { Toast as BaseToast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import { buttonClassName } from "./Button";
import { Icon } from "./Icon";

export type ToastOptions = {
	title: string;
	/** Announced to screen readers with the title, so keep it to text. */
	description?: string;
	/** Shown under the text but not announced, e.g. expandable details. */
	details?: ReactNode;
	/** Milliseconds before it closes itself; 0 keeps it open. Paused on hover. */
	timeout?: number;
	/** "high" interrupts a screen reader, for failures. */
	priority?: "low" | "high";
};

/** Holds toasts raised anywhere inside it and shows them bottom-right. */
export function ToastProvider({ children }: { children: ReactNode }) {
	return (
		<BaseToast.Provider>
			{children}
			<BaseToast.Portal>
				<BaseToast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none">
					<ToastList />
				</BaseToast.Viewport>
			</BaseToast.Portal>
		</BaseToast.Provider>
	);
}

type ToastData = { details?: ReactNode };

function ToastList() {
	const { toasts } = BaseToast.useToastManager();
	return toasts.map((toast) => (
		<BaseToast.Root
			key={toast.id}
			toast={toast}
			className="rounded-lg border border-(--line) bg-(--surface-strong) p-3 shadow-lg transition-[opacity,translate] duration-200 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0"
		>
			<BaseToast.Content className="flex items-start gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<BaseToast.Title className="m-0 text-sm font-semibold text-(--sea-ink)" />
					<BaseToast.Description className="m-0 text-sm text-(--sea-ink-soft)" />
					{(toast.data as ToastData | undefined)?.details}
				</div>
				<BaseToast.Close
					aria-label="Dismiss"
					className={buttonClassName("icon")}
				>
					<Icon icon={X} />
				</BaseToast.Close>
			</BaseToast.Content>
		</BaseToast.Root>
	));
}

/** Returns a function that shows a toast; call it inside `ToastProvider`. */
export function useShowToast(): (options: ToastOptions) => void {
	const { add } = BaseToast.useToastManager();
	return useCallback(
		({ details, ...options }: ToastOptions) => {
			add<ToastData>({ ...options, data: { details } });
		},
		[add],
	);
}
