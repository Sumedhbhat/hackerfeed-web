import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "../atoms/CodeBlock";
import { ExternalLink } from "../atoms/Link";
import { ProseList, ProseListItem } from "../atoms/ProseList";
import { Text } from "../atoms/Text";

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

/**
 * Nesting follows the indents actually used: an item indented further than
 * the one before goes one level deeper, an item back at an earlier indent
 * returns to that level, and equal indents are siblings (so 2-space and
 * 4-space styles both work). `indents` holds the indent of each open level.
 */
function nestLevel(indents: number[], indent: string): number {
	const width = indent.replace(/\t/g, "    ").length;
	while (indents.length > 1 && width < (indents.at(-1) ?? 0)) indents.pop();
	if (indents.length === 0) indents.push(width);
	else if (width > (indents.at(-1) ?? 0) && indents.length < 4)
		indents.push(width);
	return indents.length - 1;
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
	let indents: number[] = [];
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

function inline(text: string): ReactNode[] {
	return text.split(INLINE).map((part, index) => {
		const key = `${index}:${part}`;
		if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
			return <strong key={key}>{part.slice(2, -2)}</strong>;
		}
		if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
			return <code key={key}>{part.slice(1, -1)}</code>;
		}
		const link = LINK.exec(part);
		const href = link?.[2] ? safeHref(link[2]) : null;
		if (link && href) {
			return (
				<ExternalLink key={key} href={href} variant="inline">
					{link[1]}
				</ExternalLink>
			);
		}
		return <Fragment key={key}>{part}</Fragment>;
	});
}

function MarkdownList({ list }: { list: ListBlock }) {
	return (
		<ProseList ordered={list.kind === "ol"} start={list.start}>
			{list.items.map((item, itemIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: list items are positional and never reorder
				<ProseListItem key={itemIndex}>
					{inline(item.text)}
					{item.children ? <MarkdownList list={item.children} /> : null}
				</ProseListItem>
			))}
		</ProseList>
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
						<Text key={key} size="inherit" weight="semibold">
							{inline(block.text)}
						</Text>
					);
				}
				if (block.kind === "pre") {
					return <CodeBlock key={key} code={block.lines.join("\n")} />;
				}
				if (block.kind === "p") {
					return (
						<Text key={key} size="inherit">
							{block.lines.map((line, lineIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional and never reorder
								<Fragment key={lineIndex}>
									{lineIndex > 0 ? <br /> : null}
									{inline(line)}
								</Fragment>
							))}
						</Text>
					);
				}
				return <MarkdownList key={key} list={block} />;
			})}
		</div>
	);
}
