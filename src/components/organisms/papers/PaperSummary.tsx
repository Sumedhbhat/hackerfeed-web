import { BookOpen, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/atoms/Button";
import { Icon } from "#/components/atoms/Icon";
import { PaperSummaryText } from "#/components/atoms/PaperSummaryText";
import type { PaperPresentation } from "#/lib/papers/presentation";

/** AI summary of a paper, with a toggle to read the original abstract. */
export function PaperSummary({ paper }: { paper: PaperPresentation }) {
	const [showAbstract, setShowAbstract] = useState(false);
	const canShowAbstract = paper.abstract !== null;

	return (
		<>
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
		</>
	);
}
