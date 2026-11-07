import { BrandLink } from "@hackerfeed/ui/atoms/BrandLink";
import { CountBadge } from "@hackerfeed/ui/atoms/CountBadge";
import { TextLink } from "@hackerfeed/ui/atoms/Link";
import { HeaderBar } from "@hackerfeed/ui/molecules/HeaderBar";
import { useLocation } from "@tanstack/react-router";
import { useAuthSession } from "#/hooks/useAuthSession";
import { useFavorites } from "#/hooks/useFavorites";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function SiteHeader() {
	const { count: favCount } = useFavorites();
	const { user } = useAuthSession();
	const { count: paperCount } = usePaperFavorites();
	const totalCount = favCount + (user ? paperCount : 0);
	const { pathname } = useLocation();
	const inFeed = /^\/(story|chat)\//.test(pathname);

	return (
		<HeaderBar
			brand={<BrandLink to="/" />}
			links={
				<>
					<TextLink
						to="/"
						variant="nav"
						// A story and its AI chat belong to the feed, so keep Feed marked there.
						data-status={inFeed ? "active" : undefined}
					>
						Stories
					</TextLink>
					<TextLink to="/papers" variant="nav">
						Papers
					</TextLink>
					<TextLink to="/favorites" variant="nav">
						Saved
						{totalCount > 0 ? (
							<>
								{" "}
								<CountBadge count={totalCount} />
							</>
						) : null}
					</TextLink>
				</>
			}
			actions={
				<>
					<ThemeToggle />
					<UserMenu />
				</>
			}
		/>
	);
}
