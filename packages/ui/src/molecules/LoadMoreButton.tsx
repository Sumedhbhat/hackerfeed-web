import { Button } from "../atoms/Button";

/** Centered "load more" button under a list. */
export function LoadMoreButton({
	label,
	onClick,
	busy,
}: {
	label: string;
	onClick: () => void;
	busy?: boolean;
}) {
	return (
		<div className="flex justify-center pt-4">
			<Button variant="secondary" onClick={onClick} busy={busy}>
				{label}
			</Button>
		</div>
	);
}
