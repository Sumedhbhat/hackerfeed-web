import { ToggleButton, ToggleGroup } from "../atoms/Toggle";

type Topic = { keyword: string; paperCount: number };

const ALL = "\u0000all";

function ChipCount({ count }: { count: number }) {
	return <span className="text-(--sea-ink-faint) tabular-nums">{count}</span>;
}

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
			<ToggleButton variant="chip" value={ALL}>
				All papers <ChipCount count={totalCount} />
			</ToggleButton>
			{topics.map((topic) => (
				<ToggleButton variant="chip" value={topic.keyword} key={topic.keyword}>
					{topic.keyword}
					{topic.paperCount > 1 ? <ChipCount count={topic.paperCount} /> : null}
				</ToggleButton>
			))}
		</ToggleGroup>
	);
}
