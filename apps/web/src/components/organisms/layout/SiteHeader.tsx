import { BrandLink } from "#/components/atoms/BrandLink";
import { CountBadge } from "#/components/atoms/CountBadge";
import { TextLink } from "#/components/atoms/Link";
import { HeaderBar } from "#/components/molecules/HeaderBar";
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

	return (
		<HeaderBar
			brand={<BrandLink to="/" />}
			links={
				<>
					<TextLink to="/" variant="nav">
						Feed
					</TextLink>
					<TextLink to="/papers" variant="nav">
						Papers
					</TextLink>
					<TextLink to="/favorites" variant="nav">
						Favorites
						{totalCount > 0 ? <CountBadge count={totalCount} /> : null}
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
