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

	useEffect(() => {
		const text = clampedRef.current;
		if (open || !text) return;

		const measure = () =>
			setOverflows(text.scrollHeight > text.clientHeight + 1);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(text);
		return () => observer.disconnect();
	}, [open]);

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
