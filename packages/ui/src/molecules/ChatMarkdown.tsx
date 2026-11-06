import { Fragment, type ReactNode } from "react";

/*
 * The small part of Markdown that chat replies actually use: paragraphs,
 * headings, numbered and bulleted lists, fenced code blocks, **bold**,
 * `code` and [links](https://…) (http and https only). Everything renders as
 * React text, never as HTML, so a reply cannot inject markup.
 */

type Block =
	| { kind: "p"; lines: string[] }
	| { kind: "ul"; items: string[] }
	| { kind: "ol"; items: string[]; start: number }
	| { kind: "pre"; lines: string[] }
	| { kind: "h"; text: string };

const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;

const FENCE = /^\s*(```|~~~)/;

const ORDERED = /^\s*(\d+)[.)]\s+/;
const BULLET = /^\s*[-*•]\s+/;

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
		const ordered = ORDERED.exec(line);
		const kind = ordered ? "ol" : BULLET.test(line) ? "ul" : null;
		if (kind) {
			const item = line.replace(ordered ? ORDERED : BULLET, "");
			if (last?.kind === kind) last.items.push(item);
			else if (kind === "ol")
				blocks.push({ kind, items: [item], start: Number(ordered?.[1] ?? 1) });
			else blocks.push({ kind, items: [item] });
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
				const List = block.kind;
				return (
					<List
						key={key}
						start={
							block.kind === "ol" && block.start !== 1 ? block.start : undefined
						}
						className={`m-0 flex flex-col gap-1.5 pl-5 ${List === "ol" ? "list-decimal" : "list-disc"} marker:text-(--sea-ink-faint)`}
					>
						{block.items.map((item, itemIndex) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: list items are positional and never reorder
							<li key={itemIndex} className="pl-1">
								{inline(item)}
							</li>
						))}
					</List>
				);
			})}
		</div>
	);
}
