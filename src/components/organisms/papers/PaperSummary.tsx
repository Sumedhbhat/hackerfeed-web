import { BookOpen, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/atoms/Button";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/atoms/Collapsible";
import { Icon } from "#/components/atoms/Icon";
import { PaperSummaryText } from "#/components/atoms/PaperSummaryText";
import type { PaperPresentation } from "#/lib/papers/presentation";

/**
 * AI summary of a paper, hidden until asked for so long text doesn't bury
 * the paper, with a toggle to read the original abstract.
 */
export function PaperSummary({ paper }: { paper: PaperPresentation }) {
	const [open, setOpen] = useState(false);
	const [showAbstract, setShowAbstract] = useState(false);
	const canShowAbstract = paper.abstract !== null;

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger>
				<Icon icon={open ? ChevronUp : ChevronDown} />
				{open ? "Hide summary" : "Show summary"}
			</CollapsibleTrigger>
			<CollapsiblePanel>
				<PaperSummaryText>
					{showAbstract && paper.abstract ? paper.abstract : paper.summary}
				</PaperSummaryText>
				{canShowAbstract ? (
					<Button
						variant="ghost"
						onClick={() => setShowAbstract((value) => !value)}
					>
						<Icon icon={showAbstract ? Sparkles : BookOpen} />
						{showAbstract ? "Show AI summary" : "Show abstract"}
					</Button>
				) : null}
			</CollapsiblePanel>
		</Collapsible>
	);
}
