import { Avatar as BaseAvatar } from "@base-ui/react/avatar";

const SIZE = {
	sm: "h-8 w-8 text-xs",
	md: "h-11 w-11 text-sm",
	lg: "h-20 w-20 text-xl",
	/** 48px on phones, 80px from `sm` up. */
	profile: "h-12 w-12 text-base sm:h-20 sm:w-20 sm:text-xl",
} as const;

type AvatarProps = {
	name: string;
	imageUrl?: string | null;
	size?: keyof typeof SIZE;
	/** Letters to show without a picture; defaults to the first letter of `name`. */
	initials?: string;
	/** Expose `name` to screen readers instead of treating the avatar as decoration. */
	labelled?: boolean;
};

/** A person's picture, or their initials when there is no picture (or it fails to load). */
export function Avatar({
	name,
	imageUrl,
	size = "sm",
	initials,
	labelled = false,
}: AvatarProps) {
	return (
		<BaseAvatar.Root
			{...(labelled
				? { role: "img", "aria-label": name }
				: { "aria-hidden": true })}
			className={`${SIZE[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--lagoon) font-semibold text-(--on-lagoon)`}
		>
			{imageUrl ? (
				<BaseAvatar.Image
					src={imageUrl}
					alt=""
					className="h-full w-full bg-(--chip-bg) object-cover"
				/>
			) : null}
			<BaseAvatar.Fallback>
				{initials || name.trim().charAt(0).toUpperCase() || "?"}
			</BaseAvatar.Fallback>
		</BaseAvatar.Root>
	);
}
