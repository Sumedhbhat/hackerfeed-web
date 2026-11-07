import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "../atoms/CodeBlock";
import { Heading } from "../atoms/Heading";
import { ExternalLink } from "../atoms/Link";
import { ProseList, ProseListItem } from "../atoms/ProseList";
import { Text } from "../atoms/Text";

import { type ListBlock, parseInline, toBlocks } from "./chatMarkdownParse";

/*
 * The small part of Markdown that chat replies actually use: paragraphs,
 * headings, numbered and bulleted lists, fenced code blocks, **bold**,
 * `code` and [links](https://…) (http and https only). Everything renders as
 * React text, never as HTML, so a reply cannot inject markup.
 */

function inline(text: string): ReactNode[] {
	return parseInline(text).map((part, index) => {
		const key = `${index}:${part.text}`;
		if (part.kind === "strong") return <strong key={key}>{part.text}</strong>;
		if (part.kind === "code") return <code key={key}>{part.text}</code>;
		if (part.kind === "link") {
			return (
				<ExternalLink key={key} href={part.href} variant="inline">
					{part.text}
				</ExternalLink>
			);
		}
		return <Fragment key={key}>{part.text}</Fragment>;
	});
}

function MarkdownList({ list }: { list: ListBlock }) {
	return (
		<ProseList ordered={list.kind === "ol"} start={list.start}>
			{list.items.map((item, itemIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: list items are positional and never reorder
				<ProseListItem key={itemIndex}>
					{inline(item.text)}
					{item.children?.map((child, childIndex) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: child lists are positional and never reorder
						<MarkdownList key={childIndex} list={child} />
					))}
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
						<Heading key={key} level={block.level} size="inline">
							{inline(block.text)}
						</Heading>
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
