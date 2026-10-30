const MIGRATION_KEY_PREFIX = "hackerfeed:favorites:migrated:";

export function getLocalFavoritesMigrationKey(workosUserId: string): string {
	return `${MIGRATION_KEY_PREFIX}${workosUserId}`;
}

export function hasCompletedLocalFavoritesMigration(
	workosUserId: string,
): boolean {
	if (typeof window === "undefined") return true;

	return (
		window.localStorage.getItem(getLocalFavoritesMigrationKey(workosUserId)) ===
		"1"
	);
}

export function markLocalFavoritesMigrationCompleted(
	workosUserId: string,
): void {
	if (typeof window === "undefined") return;

	window.localStorage.setItem(getLocalFavoritesMigrationKey(workosUserId), "1");
}
