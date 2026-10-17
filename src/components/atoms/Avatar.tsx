import { useState } from "react";

const SIZE = {
	sm: "h-8 w-8 text-xs",
	md: "h-11 w-11 text-sm",
	lg: "h-20 w-20 text-xl",
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
	const [imageFailed, setImageFailed] = useState(false);

	if (imageUrl && !imageFailed) {
		return (
			<img
				src={imageUrl}
				alt={labelled ? name : ""}
				onError={() => setImageFailed(true)}
				className={`${SIZE[size]} shrink-0 rounded-full border border-(--chip-line) bg-(--chip-bg) object-cover`}
			/>
		);
	}
	return (
		<span
			aria-hidden={labelled ? undefined : "true"}
			className={`${SIZE[size]} flex shrink-0 items-center justify-center rounded-full border border-(--chip-line) bg-(--lagoon) font-semibold text-white`}
		>
			{initials || name.trim().charAt(0).toUpperCase() || "?"}
		</span>
	);
}
