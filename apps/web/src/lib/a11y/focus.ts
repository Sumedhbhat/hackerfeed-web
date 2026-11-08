const FOCUSABLE =
	'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([type="hidden"])';

export function focusFirstIn(root: Element | null | undefined): boolean {
	const target = root?.querySelector<HTMLElement>(FOCUSABLE);
	target?.focus();
	return Boolean(target);
}

export function focusIsLost(): boolean {
	return !document.activeElement || document.activeElement === document.body;
}
