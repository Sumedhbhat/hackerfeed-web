/**
 * Keyboard and screen-reader users who open a story and come back with Back
 * should land on the control they used, not at the top of the page (WCAG
 * 2.4.3). The router restores the scroll position; this restores focus.
 */
const STORAGE_KEY = "hackerfeed:return-focus";

type ReturnFocus = { entry: string; label: string };

/** The router's key for the current history entry. */
function historyEntryKey(): string | undefined {
	const state = window.history.state as { __TSR_key?: string } | null;
	return state?.__TSR_key;
}

/** Call when a control navigates away within the app. */
export function rememberReturnFocus(control: Element) {
	const entry = historyEntryKey();
	const label = control.getAttribute("aria-label");
	if (!entry || !label) return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ entry, label }));
	} catch {
		// Storage can be unavailable (private mode); focus just isn't restored.
	}
}

/**
 * When this page is the history entry a remembered control was on (the reader
 * came back), focus that control again. Returns whether it did.
 */
export function restoreReturnFocus(): boolean {
	let saved: ReturnFocus | null = null;
	try {
		saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
	} catch {
		return false;
	}
	if (!saved || saved.entry !== historyEntryKey()) return false;
	const control = [
		...document.querySelectorAll<HTMLElement>("[aria-label]"),
	].find((element) => element.getAttribute("aria-label") === saved.label);
	if (!control) return false;
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {}
	control.focus({ preventScroll: true });
	return true;
}
