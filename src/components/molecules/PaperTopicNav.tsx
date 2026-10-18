import { ToggleButton, ToggleGroup } from "#/components/atoms/Toggle";

type Topic = { keyword: string; paperCount: number };

const ALL = "\u0000all";

/** Scrollable row of topic filter chips, starting with "All papers". */
export function PaperTopicNav({
	totalCount,
	topics,
	selected,
	onSelect,
}: {
	totalCount: number;
	topics: Topic[];
	selected?: string;
	onSelect: (topic: string | undefined) => void;
}) {
	return (
		<ToggleGroup
			layout="scroll"
			aria-label="Popular paper topics"
			value={selected ?? ALL}
			onValueChange={(topic) => onSelect(topic === ALL ? undefined : topic)}
		>
			<ToggleButton variant="secondary" value={ALL}>
				All papers <small>{totalCount}</small>
			</ToggleButton>
			{topics.map((topic) => (
				<ToggleButton
					variant="secondary"
					value={topic.keyword}
					key={topic.keyword}
				>
					{topic.keyword} <small>{topic.paperCount}</small>
				</ToggleButton>
			))}
		</ToggleGroup>
	);
}
