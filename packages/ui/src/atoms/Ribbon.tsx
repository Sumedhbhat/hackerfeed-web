/**
 * The brass bookmark that hangs from the top edge of a saved row, in line
 * with the row's Save button (which sits at the far right and reserves the
 * width of "Saved"). Its parent must be `relative`.
 */
export function Ribbon({ drop = false }: { drop?: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={`ribbon absolute top-0 right-12 h-5 w-3 ${drop ? "ribbon-drop" : ""}`}
		/>
	);
}
