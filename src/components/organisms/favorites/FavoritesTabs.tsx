import { Tab, TabList } from "@hackerfeed/ui/atoms/Tabs";

/** "Stories | Papers" tabs with arrow/Home/End keyboard navigation. */
export function FavoritesTabs() {
	return (
		<TabList aria-label="Favorite type" activateOnFocus>
			<Tab value="stories">Stories</Tab>
			<Tab value="papers">Papers</Tab>
		</TabList>
	);
}
