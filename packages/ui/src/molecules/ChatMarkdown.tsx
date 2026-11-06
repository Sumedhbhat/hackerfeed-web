import { Fragment, type ReactNode } from "react";

/*
 * The small part of Markdown that chat replies actually use: paragraphs,
 * numbered and bulleted lists, **bold** and `code`. Everything renders as
 * React text, never as HTML, so a reply cannot inject markup.
 */

type Block =
	| { kind: "p"; lines: string[] }
	| { kind: "ol" | "ul"; items: string[] };

const ORDERED = /^\s*\d+[.)]\s+/;
const BULLET = /^\s*[-*•]\s+/;

function toBlocks(text: string): Block[] {
	const blocks: Block[] = [];
	for (const line of text.split("\n")) {
		const last = blocks.at(-1);
		if (!line.trim()) {
			blocks.push({ kind: "p", lines: [] });
			continue;
		}
		const kind = ORDERED.test(line) ? "ol" : BULLET.test(line) ? "ul" : null;
		if (kind) {
			const item = line.replace(kind === "ol" ? ORDERED : BULLET, "");
			if (last?.kind === kind) last.items.push(item);
			else blocks.push({ kind, items: [item] });
		} else if (last?.kind === "p") {
			last.lines.push(line);
		} else {
			blocks.push({ kind: "p", lines: [line] });
		}
	}
	return blocks.filter((block) =>
		block.kind === "p" ? block.lines.length > 0 : true,
	);
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
