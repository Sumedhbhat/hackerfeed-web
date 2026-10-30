import { Button } from "../atoms/Button";

/** Centered "load more" button under a list. */
export function LoadMoreButton({
	label,
	onClick,
	disabled,
}: {
	label: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<div className="flex justify-center pt-7">
			<Button variant="secondary" onClick={onClick} disabled={disabled}>
				{label}
			</Button>
		</div>
	);
}
