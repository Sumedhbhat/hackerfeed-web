import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "@hackerfeed/ui/atoms/Collapsible";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperSummaryText } from "@hackerfeed/ui/atoms/PaperSummaryText";
import { ActionLine } from "@hackerfeed/ui/molecules/ActionLine";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { PaperPresentation } from "#/lib/papers/presentation";

/**
 * A paper's short summary cut to 3 lines, with "Show more" for the full
 * abstract when there is more to read; `links` share that line.
 */
export function PaperSummary({
	paper,
	links,
}: {
	paper: PaperPresentation;
	/** Secondary links (project, code) shown on the same line as Show more. */
	links?: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [overflows, setOverflows] = useState(false);
	const clampedRef = useRef<HTMLParagraphElement>(null);

	// Without an AI summary, `summary` is the full abstract; only the browser
	// knows whether 3 lines cut it off.
	useEffect(() => {
		const text = clampedRef.current;
		if (text) setOverflows(text.scrollHeight > text.clientHeight);
	}, []);

	const canExpand = paper.abstract !== null || overflows;

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			{open ? null : (
				<PaperSummaryText clamped ref={clampedRef}>
					{paper.summary}
				</PaperSummaryText>
			)}
			<CollapsiblePanel>
				<PaperSummaryText>{paper.abstract ?? paper.summary}</PaperSummaryText>
			</CollapsiblePanel>
			{canExpand || links ? (
				<ActionLine>
					{canExpand ? (
						<CollapsibleTrigger>
							{open ? "Show less" : "Show more"}
							<Icon icon={open ? ChevronUp : ChevronDown} />
						</CollapsibleTrigger>
					) : null}
					{links}
				</ActionLine>
			) : null}
		</Collapsible>
	);
}
