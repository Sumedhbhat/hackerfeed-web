const HEIGHT = {
	xs: "h-2.5",
	sm: "h-3",
	md: "h-4",
	lg: "h-5",
	xl: "h-6",
	block: "h-16",
	avatar: "h-20",
} as const;

const SHAPE = {
	bar: "rounded-sm",
	block: "rounded",
	circle: "rounded-full",
} as const;

type SkeletonProps = {
	/** Any CSS width, e.g. "6rem" or "75%". */
	width?: string;
	height?: keyof typeof HEIGHT;
	shape?: keyof typeof SHAPE;
	/** How visible the placeholder is, 0.3 to 1. */
	opacity?: number;
};

/** Grey placeholder shown while content loads. Wrap a group in <SkeletonGroup> to pulse it. */
export function Skeleton({
	width = "100%",
	height = "md",
	shape = "bar",
	opacity = 0.5,
}: SkeletonProps) {
	return (
		<div
			aria-hidden="true"
			className={`shrink-0 bg-(--sand) ${HEIGHT[height]} ${SHAPE[shape]}`}
			style={{ width, opacity }}
		/>
	);
}

/** Pulses everything inside it. */
export function SkeletonGroup({ children }: { children: React.ReactNode }) {
	return <div className="animate-pulse">{children}</div>;
}
