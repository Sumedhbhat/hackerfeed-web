/**
 * The visible words of an on/off button ("Save" / "Saved"). Both words occupy
 * the same space so pressing the button never moves its neighbours. With
 * `iconOnlyOnPhones` the words hide on phones; the button's aria-label names it.
 */
export function ToggleLabel({
	on,
	offLabel,
	onLabel,
	iconOnlyOnPhones = false,
}: {
	on: boolean;
	offLabel: string;
	onLabel: string;
	iconOnlyOnPhones?: boolean;
}) {
	return (
		<span
			aria-hidden="true"
			className={`grid ${iconOnlyOnPhones ? "max-sm:hidden" : ""}`}
		>
			<span className={`col-start-1 row-start-1 ${on ? "invisible" : ""}`}>
				{offLabel}
			</span>
			<span className={`col-start-1 row-start-1 ${on ? "" : "invisible"}`}>
				{onLabel}
			</span>
		</span>
	);
}
