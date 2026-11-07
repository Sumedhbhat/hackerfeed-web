/** Keyboard-reachable controls, skipping ones taken out of the tab order. */
const FOCUSABLE =
	'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([type="hidden"])';

/** Focuses the first keyboard-reachable control inside `root`. Returns whether it did. */
export function focusFirstIn(root: Element | null | undefined): boolean {
	const target = root?.querySelector<HTMLElement>(FOCUSABLE);
	target?.focus();
	return Boolean(target);
}

/** True when focus was dropped, e.g. because the focused control was removed. */
export function focusIsLost(): boolean {
	return !document.activeElement || document.activeElement === document.body;
}
