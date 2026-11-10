/** Both words share one grid cell so toggling never moves the neighbours; the button's aria-label names it. */
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
