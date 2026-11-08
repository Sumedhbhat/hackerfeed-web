import { CountBadge } from "@hackerfeed/ui/atoms/CountBadge";
import { Tab, TabList } from "@hackerfeed/ui/atoms/Tabs";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";

export function FavoritesTabs() {
	const { count: storyCount } = useFavorites();
	const { count: paperCount } = usePaperFavorites();
	return (
		<TabList aria-label="Saved items" activateOnFocus>
			<Tab value="stories">
				Stories {storyCount > 0 ? <CountBadge count={storyCount} /> : null}
			</Tab>
			<Tab value="papers">
				Papers {paperCount > 0 ? <CountBadge count={paperCount} /> : null}
			</Tab>
		</TabList>
	);
}
