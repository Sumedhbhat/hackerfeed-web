import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "@hackerfeed/ui/atoms/Collapsible";
import { Icon } from "@hackerfeed/ui/atoms/Icon";
import { PaperSummaryText } from "@hackerfeed/ui/atoms/PaperSummaryText";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { ActionLine } from "@hackerfeed/ui/molecules/ActionLine";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { PaperPresentation } from "#/lib/papers/presentation";

/**
 * A paper's short summary cut to 3 lines, with "Show more" for the full
 * abstract when there is more to read.
 */
export function PaperSummary({
	paper,
	links,
}: {
	paper: PaperPresentation;
	links?: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [overflows, setOverflows] = useState(false);
	const clampedRef = useRef<HTMLParagraphElement>(null);

	// Without an AI summary, `summary` is the full abstract; only the browser
	// knows whether 3 lines cut it off, and that changes with the width (zoom,
	// rotation, resizing) and once web fonts load, so measure on every resize.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the clamped text remounts when "Show less" closes the panel
	useEffect(() => {
		const text = clampedRef.current;
		if (!text) return;
		const measure = () => setOverflows(text.scrollHeight > text.clientHeight);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(text);
		return () => observer.disconnect();
	}, [open]);

	const canExpand = paper.abstract !== null || overflows;

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<Stack gap="section">
				{open ? null : (
					<PaperSummaryText clamped ref={clampedRef}>
						{paper.summary}
					</PaperSummaryText>
				)}
				<CollapsiblePanel>
					<PaperSummaryText>{paper.abstract ?? paper.summary}</PaperSummaryText>
				</CollapsiblePanel>
				{canExpand || links ? (
					<ActionLine flush>
						{canExpand ? (
							<CollapsibleTrigger
								aria-label={`${open ? "Show less" : "Show more"} of ${paper.title}`}
							>
								{open ? "Show less" : "Show more"}
								<Icon icon={open ? ChevronUp : ChevronDown} />
							</CollapsibleTrigger>
						) : null}
						{links}
					</ActionLine>
				) : null}
			</Stack>
		</Collapsible>
	);
}
