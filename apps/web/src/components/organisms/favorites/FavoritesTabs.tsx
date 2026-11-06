import { CountBadge } from "@hackerfeed/ui/atoms/CountBadge";
import { Tab, TabList } from "@hackerfeed/ui/atoms/Tabs";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";

/** "Stories | Papers" tabs, each with how many are saved, with arrow/Home/End keyboard navigation. */
export function FavoritesTabs() {
	const { count: storyCount } = useFavorites();
	const { count: paperCount } = usePaperFavorites();
	return (
		<TabList aria-label="Saved items" activateOnFocus>
			<Tab value="stories">
				Stories <CountBadge count={storyCount} />
			</Tab>
			<Tab value="papers">
				Papers <CountBadge count={paperCount} />
			</Tab>
		</TabList>
	);
}
