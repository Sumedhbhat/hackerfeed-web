/**
 * Keyboard and screen-reader users who open a story and come back with Back
 * should land on the control they used, not at the top of the page (WCAG
 * 2.4.3). The router restores the scroll position; this restores focus.
 */
const STORAGE_KEY = "hackerfeed:return-focus";

type ReturnFocus = {
	entry: string;
	label: string;
	index: number;
	path: string;
};

type RouterHistoryState = { __TSR_key?: string; __TSR_index?: number } | null;

/** The router's key for the current history entry. */
function historyEntryKey(): string | undefined {
	return (window.history.state as RouterHistoryState)?.__TSR_key;
}

function historyIndex(): number | undefined {
	return (window.history.state as RouterHistoryState)?.__TSR_index;
}

function readSaved(): ReturnFocus | null {
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
	} catch {
		return null;
	}
}

/** Call when a control navigates away within the app. */
export function rememberReturnFocus(control: Element) {
	const entry = historyEntryKey();
	const index = historyIndex();
	const label = control.getAttribute("aria-label");
	if (!entry || index === undefined || !label) return;
	const path = window.location.pathname;
	try {
		sessionStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ entry, label, index, path } satisfies ReturnFocus),
		);
	} catch {
		// Storage can be unavailable (private mode); focus just isn't restored.
	}
}

/**
 * When this page is the history entry a remembered control was on (the reader
 * came back), focus that control again. Returns whether it did.
 */
export function restoreReturnFocus(): boolean {
	const saved = readSaved();
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

/**
 * An in-page "← Back" link to `path` should act like the browser's Back
 * button when the reader just came from there, so focus and scroll return to
 * where they were. Returns true if it went back.
 */
export function goBackIfReturningTo(path: string): boolean {
	const saved = readSaved();
	const index = historyIndex();
	if (!saved || index === undefined) return false;
	if (saved.path !== path || saved.index !== index - 1) return false;
	window.history.back();
	return true;
}
