import { Button } from "#/components/atoms/Button";

type Topic = { keyword: string; paperCount: number };

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
		<nav className="papers-topics" aria-label="Popular paper topics">
			<Button
				variant="secondary"
				aria-pressed={!selected}
				onClick={() => onSelect(undefined)}
			>
				All papers <small>{totalCount}</small>
			</Button>
			{topics.map((topic) => (
				<Button
					variant="secondary"
					aria-pressed={selected === topic.keyword}
					onClick={() => onSelect(topic.keyword)}
					key={topic.keyword}
				>
					{topic.keyword} <small>{topic.paperCount}</small>
				</Button>
			))}
		</nav>
	);
}
