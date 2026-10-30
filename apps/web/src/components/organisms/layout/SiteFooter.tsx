import { FooterBar } from "#/components/molecules/FooterBar";

export default function SiteFooter() {
	const year = new Date().getFullYear();

	return (
		<FooterBar
			title="HackerFeed"
			tagline="A clean reader for Hacker News stories and daily research papers."
			copyright={<>&copy; {year} HackerFeed</>}
		/>
	);
}
