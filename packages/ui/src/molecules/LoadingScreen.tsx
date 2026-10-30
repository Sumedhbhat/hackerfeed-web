import { Spinner } from "../atoms/Spinner";

/** Full-height centered spinner for whole-page loading. */
export function LoadingScreen({ label }: { label?: string }) {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<Spinner label={label} />
		</div>
	);
}
