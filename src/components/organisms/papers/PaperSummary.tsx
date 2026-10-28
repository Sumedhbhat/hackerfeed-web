import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/atoms/Collapsible";
import { Icon } from "#/components/atoms/Icon";
import { PaperSummaryText } from "#/components/atoms/PaperSummaryText";
import type { PaperPresentation } from "#/lib/papers/presentation";

/**
 * A paper's short summary cut to 3 lines, with "Show more" for the full
 * abstract when there is more to read.
 */
export function PaperSummary({ paper }: { paper: PaperPresentation }) {
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
			{canExpand ? (
				<CollapsibleTrigger>
					{open ? "Show less" : "Show more"}
					<Icon icon={open ? ChevronUp : ChevronDown} />
				</CollapsibleTrigger>
			) : null}
		</Collapsible>
	);
}
