import { PageContainer } from "../atoms/PageContainer";
import { Skeleton, SkeletonGroup } from "../atoms/Skeleton";

/** Pulsing placeholder for the whole papers screen while an edition loads. */
export function PaperFeedSkeleton({
	label = "Loading papers",
}: {
	label?: string;
}) {
	return (
		<PageContainer>
			<output aria-label={label} className="block">
				<SkeletonGroup>
					<div className="mb-4 flex gap-2">
						<Skeleton width="100%" height="xl" shape="block" />
						<Skeleton width="9rem" height="xl" shape="block" />
					</div>
					<div className="flex flex-col gap-3">
						{[0, 1, 2].map((row) => (
							<div
								key={row}
								className="flex flex-col gap-3 rounded-xl border border-(--line) bg-(--surface-strong) p-4 shadow-(--shadow-raised) sm:p-6"
							>
								<Skeleton width="70%" height="lg" />
								<Skeleton width="30%" height="xs" />
								<Skeleton width="95%" height="sm" opacity={0.35} />
								<Skeleton width="85%" height="sm" opacity={0.35} />
							</div>
						))}
					</div>
				</SkeletonGroup>
			</output>
		</PageContainer>
	);
}
