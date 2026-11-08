export type ListItem = { text: string; children?: ListBlock[] };
export type ListBlock = { kind: "ul" | "ol"; start: number; items: ListItem[] };

export type Block =
	| { kind: "p"; lines: string[] }
	| ListBlock
	| { kind: "pre"; lines: string[] }
	| { kind: "h"; level: 3 | 4; text: string };

const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;

const FENCE = /^\s*(`{3,}|~{3,})/;

const ORDERED = /^(\s*)(\d+)[.)]\s+/;
const BULLET = /^(\s*)[-*•]\s+/;

/**
 * Nesting follows the indents actually used rather than a fixed width, so
 * 2-space and 4-space styles both work. `indents` holds each open level's indent.
 */
function nestLevel(indents: number[], indent: string): number {
	const width = indent.replace(/\t/g, "    ").length;
	while (indents.length > 1 && width < (indents.at(-1) ?? 0)) indents.pop();
	if (indents.length === 0) indents.push(width);
	else if (width > (indents.at(-1) ?? 0) && indents.length < 4)
		indents.push(width);
	return indents.length - 1;
}

function addItem(
	list: ListBlock,
	level: number,
	kind: ListBlock["kind"],
	text: string,
	start: number,
) {
	let target = list;
	for (let depth = 0; depth < level; depth++) {
		const parent = target.items.at(-1);
		if (!parent) break;
		parent.children ??= [];
		const deepest = depth === level - 1;
		let child = parent.children.at(-1);
		// At the item's own level a different marker starts a separate list.
		if (!child || (deepest && child.kind !== kind)) {
			child = { kind, start, items: [] };
			parent.children.push(child);
		}
		target = child;
	}
	target.items.push({ text });
}

function lastItem(list: ListBlock): ListItem | undefined {
	const item = list.items.at(-1);
	const lastChild = item?.children?.at(-1);
	return lastChild ? (lastItem(lastChild) ?? item) : item;
}

export function toBlocks(text: string): Block[] {
	const blocks: Block[] = [];
	// A blank line ends a paragraph, but a list carries on across blank lines
	// ("1. a\n\n2. b" is one list), as Markdown renderers do.
	let afterBlank = false;
	let indents: number[] = [];
	let fence: {
		marker: string;
		block: { kind: "pre"; lines: string[] };
	} | null = null;
	for (const line of text.split("\n")) {
		// Inside a fence every line is kept as written, blank or not, until the
		// matching closing fence (or the end of a reply that is still streaming).
		if (fence) {
			const closing = line.trim();
			if (
				closing.length >= fence.marker.length &&
				closing === (fence.marker[0] ?? "`").repeat(closing.length)
			) {
				fence = null;
			} else fence.block.lines.push(line);
			continue;
		}
		const opening = FENCE.exec(line);
		if (opening?.[1]) {
			const block = { kind: "pre" as const, lines: [] };
			blocks.push(block);
			fence = { marker: opening[1], block };
			afterBlank = false;
			continue;
		}
		if (!line.trim()) {
			afterBlank = true;
			continue;
		}
		const heading = HEADING.exec(line);
		if (heading) {
			// The page already has h1 and h2; a reply's own headings sit below them.
			const level = (heading[1]?.length ?? 1) <= 2 ? 3 : 4;
			blocks.push({ kind: "h", level, text: heading[2] ?? "" });
			afterBlank = false;
			continue;
		}
		const last = blocks.at(-1);
		const lastList = last?.kind === "ul" || last?.kind === "ol" ? last : null;
		const ordered = ORDERED.exec(line);
		const bullet = ordered ? null : BULLET.exec(line);
		const marker = ordered ?? bullet;
		if (marker) {
			const kind = ordered ? "ol" : "ul";
			const text = line.slice(marker[0].length);
			const start = ordered ? Number(ordered[2]) : 1;
			const continues = lastList !== null && indents.length > 0;
			if (!continues) indents = [];
			const level = nestLevel(indents, marker[1] ?? "");
			if (lastList && continues && (level > 0 || lastList.kind === kind)) {
				addItem(lastList, level, kind, text, start);
			} else {
				indents = [];
				nestLevel(indents, marker[1] ?? "");
				blocks.push({ kind, start, items: [{ text }] });
			}
		} else if (lastList && !afterBlank) {
			// A plain line right under a list item continues that item.
			const item = lastItem(lastList);
			if (item) item.text = `${item.text} ${line.trim()}`;
		} else if (last?.kind === "p" && !afterBlank) {
			last.lines.push(line);
		} else {
			blocks.push({ kind: "p", lines: [line] });
		}
		afterBlank = false;
	}
	return blocks;
}

// A link destination may hold one level of balanced parentheses, as in
// https://en.wikipedia.org/wiki/Cache_(computing).
const DESTINATION = String.raw`(?:[^()\s]|\([^()\s]*\))+`;
const INLINE = new RegExp(
	String.raw`(\*\*[^*]+\*\*|` +
		"`[^`]+`" +
		String.raw`|\[[^\]]+\]\(${DESTINATION}\))`,
	"g",
);
const LINK = new RegExp(String.raw`^\[([^\]]+)\]\((${DESTINATION})\)$`);

/** Only web links become anchors; anything else (javascript:, data:) stays text. */
function safeHref(url: string): string | null {
	try {
		const { protocol } = new URL(url);
		return protocol === "https:" || protocol === "http:" ? url : null;
	} catch {
		return null;
	}
}

export type InlinePart =
	| { kind: "text"; text: string }
	| { kind: "strong"; text: string }
	| { kind: "code"; text: string }
	| { kind: "link"; text: string; href: string };

export function parseInline(text: string): InlinePart[] {
	return text
		.split(INLINE)
		.filter((part) => part !== "")
		.map((part): InlinePart => {
			if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
				return { kind: "strong", text: part.slice(2, -2) };
			}
			if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
				return { kind: "code", text: part.slice(1, -1) };
			}
			const link = LINK.exec(part);
			const href = link?.[2] ? safeHref(link[2]) : null;
			if (link?.[1] && href) return { kind: "link", text: link[1], href };
			return { kind: "text", text: part };
		});
}
