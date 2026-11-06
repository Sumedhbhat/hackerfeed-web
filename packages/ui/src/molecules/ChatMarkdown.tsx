import { Fragment, type ReactNode } from "react";

/*
 * The small part of Markdown that chat replies actually use: paragraphs,
 * headings, numbered and bulleted lists, fenced code blocks, **bold**,
 * `code` and [links](https://…) (http and https only). Everything renders as
 * React text, never as HTML, so a reply cannot inject markup.
 */

type ListItem = { text: string; children?: ListBlock };
type ListBlock = { kind: "ul" | "ol"; start: number; items: ListItem[] };

type Block =
	| { kind: "p"; lines: string[] }
	| ListBlock
	| { kind: "pre"; lines: string[] }
	| { kind: "h"; text: string };

const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;

const FENCE = /^\s*(```|~~~)/;

const ORDERED = /^(\s*)(\d+)[.)]\s+/;
const BULLET = /^(\s*)[-*•]\s+/;

/** Every two spaces of indent nest a list item one level deeper (up to 3). */
function nestLevel(indent: string): number {
	return Math.min(Math.floor(indent.replace(/\t/g, "  ").length / 2), 3);
}

/** Adds an item `level` lists deep below the last item of `list`. */
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
		parent.children ??= { kind, start, items: [] };
		target = parent.children;
	}
	target.items.push({ text });
}

/** The most deeply nested last item, where a continuation line belongs. */
function lastItem(list: ListBlock): ListItem | undefined {
	const item = list.items.at(-1);
	return item?.children ? (lastItem(item.children) ?? item) : item;
}

function toBlocks(text: string): Block[] {
	const blocks: Block[] = [];
	// A blank line ends a paragraph, but a list carries on across blank lines
	// ("1. a\n\n2. b" is one list), as Markdown renderers do.
	let afterBlank = false;
	let fence: {
		marker: string;
		block: { kind: "pre"; lines: string[] };
	} | null = null;
	for (const line of text.split("\n")) {
		// Inside a fence every line is kept as written, blank or not, until the
		// matching closing fence (or the end of a reply that is still streaming).
		if (fence) {
			if (line.trim() === fence.marker) fence = null;
			else fence.block.lines.push(line);
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
			blocks.push({ kind: "h", text: heading[1] ?? "" });
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
			const level = nestLevel(marker[1] ?? "");
			const text = line.slice(marker[0].length);
			const start = ordered ? Number(ordered[2]) : 1;
			if (lastList && (level > 0 || lastList.kind === kind)) {
				addItem(lastList, level, kind, text, start);
			} else {
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

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

/** Only web links become anchors; anything else (javascript:, data:) stays text. */
function safeHref(url: string): string | null {
	try {
		const { protocol } = new URL(url);
		return protocol === "https:" || protocol === "http:" ? url : null;
	} catch {
		return null;
	}
}

function inline(text: string): ReactNode[] {
	return text.split(INLINE).map((part, index) => {
		const key = `${index}:${part}`;
		if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
			return (
				<strong key={key} className="font-semibold">
					{part.slice(2, -2)}
				</strong>
			);
		}
		if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
			return <code key={key}>{part.slice(1, -1)}</code>;
		}
		const link = LINK.exec(part);
		const href = link?.[2] ? safeHref(link[2]) : null;
		if (link && href) {
			return (
				<a
					key={key}
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="text-(--lagoon-deep) underline decoration-(--lagoon)/40 underline-offset-[3px] hover:decoration-(--lagoon)"
				>
					{link[1]}
				</a>
			);
		}
		return <Fragment key={key}>{part}</Fragment>;
	});
}

function MarkdownList({ list }: { list: ListBlock }) {
	const List = list.kind;
	return (
		<List
			start={list.kind === "ol" && list.start !== 1 ? list.start : undefined}
			className={`m-0 flex flex-col gap-1.5 pl-5 ${List === "ol" ? "list-decimal" : "list-disc"} marker:text-(--sea-ink-faint)`}
		>
			{list.items.map((item, itemIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: list items are positional and never reorder
				<li key={itemIndex} className="pl-1">
					{inline(item.text)}
					{item.children ? (
						<div className="mt-1.5">
							<MarkdownList list={item.children} />
						</div>
					) : null}
				</li>
			))}
		</List>
	);
}

/** A chat reply's text with its light Markdown formatting applied. */
export function ChatMarkdown({ text }: { text: string }) {
	return (
		<div className="flex flex-col gap-3">
			{toBlocks(text).map((block, index) => {
				// Blocks are positional and a reply never reorders them.
				const key = `${block.kind}-${index}`;
				if (block.kind === "h") {
					return (
						<p key={key} className="m-0 mt-1 font-semibold text-(--sea-ink)">
							{inline(block.text)}
						</p>
					);
				}
				if (block.kind === "pre") {
					return (
						<pre
							key={key}
							className="m-0 overflow-x-auto rounded-lg bg-(--chip-bg) px-3.5 py-3 text-meta"
						>
							<code>{block.lines.join("\n")}</code>
						</pre>
					);
				}
				if (block.kind === "p") {
					return (
						<p key={key} className="m-0">
							{block.lines.map((line, lineIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional and never reorder
								<Fragment key={lineIndex}>
									{lineIndex > 0 ? <br /> : null}
									{inline(line)}
								</Fragment>
							))}
						</p>
					);
				}
				return <MarkdownList key={key} list={block} />;
			})}
		</div>
	);
}
