import { Tab } from "#/components/atoms/Tab";
import { TabList } from "#/components/molecules/TabList";
import type { FavoritesType } from "#/routes/favorites";

const TYPES = ["stories", "papers"] as const;

/** "Stories | Papers" tabs with arrow/Home/End keyboard navigation. */
export function FavoritesTabs({
	activeType,
	onTypeChange,
}: {
	activeType: FavoritesType;
	onTypeChange: (type: FavoritesType) => void;
}) {
	function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
		event.preventDefault();
		const focusedType = event.currentTarget.id.includes("papers")
			? "papers"
			: "stories";
		const nextType =
			event.key === "Home"
				? "stories"
				: event.key === "End"
					? "papers"
					: focusedType === "stories"
						? "papers"
						: "stories";
		onTypeChange(nextType);
		document.getElementById(`favorites-${nextType}-tab`)?.focus();
	}

	return (
		<TabList role="tablist" aria-label="Favorite type">
			{TYPES.map((type) => (
				<Tab
					key={type}
					role="tab"
					aria-selected={activeType === type}
					aria-controls={`favorites-${type}-panel`}
					id={`favorites-${type}-tab`}
					tabIndex={activeType === type ? 0 : -1}
					onClick={() => onTypeChange(type)}
					onKeyDown={handleTabKeyDown}
				>
					{type === "stories" ? "Stories" : "Papers"}
				</Tab>
			))}
		</TabList>
	);
}
