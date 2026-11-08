// The router restores scroll on Back but not focus; this returns focus to the
// control the reader left from.
const STORAGE_KEY = "hackerfeed:return-focus";

type ReturnFocus = {
	entry: string;
	label: string;
	index: number;
	path: string;
};

// Identifies the control again after the page re-renders.
function controlLabel(control: Element): string {
	return (
		control.getAttribute("aria-label") ??
		control.textContent?.replace(/\s+/g, " ").trim() ??
		""
	);
}

type RouterHistoryState = { __TSR_key?: string; __TSR_index?: number } | null;

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

export function rememberReturnFocus(control: Element) {
	const entry = historyEntryKey();
	const index = historyIndex();
	const label = controlLabel(control);
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

export function restoreReturnFocus(): boolean {
	const saved = readSaved();
	if (!saved || saved.entry !== historyEntryKey()) return false;
	const control = [
		...document.querySelectorAll<HTMLElement>("a[href], button"),
	].find((element) => controlLabel(element) === saved.label);
	if (!control) return false;
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {}
	control.focus({ preventScroll: true });
	return true;
}

// An in-page "← Back" link acts like the browser's Back when the reader just
// came from `path`, so focus and scroll return to where they were.
export function goBackIfReturningTo(path: string): boolean {
	const saved = readSaved();
	const index = historyIndex();
	if (!saved || index === undefined) return false;
	if (saved.path !== path || saved.index !== index - 1) return false;
	window.history.back();
	return true;
}
