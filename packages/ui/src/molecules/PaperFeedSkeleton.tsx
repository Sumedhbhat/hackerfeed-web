/** Pulsing placeholder for the whole papers screen while an edition loads. */
export function PaperFeedSkeleton({
	label = "Loading papers",
}: {
	label?: string;
}) {
	return (
		<main className="papers-page">
			<output className="papers-shell papers-loading" aria-label={label}>
				<div />
				<div />
				<div />
			</output>
		</main>
	);
}
