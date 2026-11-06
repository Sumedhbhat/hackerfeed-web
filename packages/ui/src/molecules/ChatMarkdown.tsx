import { Fragment, type ReactNode } from "react";

/*
 * The small part of Markdown that chat replies actually use: paragraphs,
 * numbered and bulleted lists, fenced code blocks, **bold** and `code`. Everything renders as
 * React text, never as HTML, so a reply cannot inject markup.
 */

type Block =
	| { kind: "p"; lines: string[] }
	| { kind: "ul"; items: string[] }
	| { kind: "ol"; items: string[]; start: number }
	| { kind: "pre"; lines: string[] };

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

function inline(text: string): ReactNode[] {
	return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
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
				if (block.kind === "pre") {
					return (
						<pre
							key={key}
							className="m-0 overflow-x-auto rounded-lg bg-(--chip-bg) px-3.5 py-3 text-[0.8125rem] leading-relaxed"
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
