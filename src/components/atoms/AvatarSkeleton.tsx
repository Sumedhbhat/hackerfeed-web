/** Round placeholder the size of a small Avatar, shown while the user loads. */
export function AvatarSkeleton() {
	return (
		<div className="h-8 w-8 animate-pulse rounded-full border border-(--chip-line) bg-(--chip-bg)" />
	);
}
