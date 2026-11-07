/**
 * The visible words of an on/off button ("Save" / "Saved"). Both words occupy
 * the same space so pressing the button never moves its neighbours. The
 * button's aria-label names it; these words are for sighted readers.
 */
export function ToggleLabel({
	on,
	offLabel,
	onLabel,
}: {
	on: boolean;
	offLabel: string;
	onLabel: string;
}) {
	return (
		<span aria-hidden="true" className="grid">
			<span className={`col-start-1 row-start-1 ${on ? "invisible" : ""}`}>
				{offLabel}
			</span>
			<span className={`col-start-1 row-start-1 ${on ? "" : "invisible"}`}>
				{onLabel}
			</span>
		</span>
	);
}
