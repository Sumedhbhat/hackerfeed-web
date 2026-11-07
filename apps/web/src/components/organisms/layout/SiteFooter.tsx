import { FooterBar } from "@hackerfeed/ui/molecules/FooterBar";

export default function SiteFooter() {
	const year = new Date().getFullYear();

	return (
		<FooterBar
			title="HackerFeed"
			tagline="Today's stories and papers, and the ones you kept."
			copyright={<>&copy; {year} HackerFeed</>}
		/>
	);
}
