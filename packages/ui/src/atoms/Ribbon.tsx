/**
 * The brass bookmark that hangs from the top edge of a saved row, in line
 * with the row's Save button (which sits at the far right). Its parent must be
 * `relative`. Save is a 44px icon button on the narrowest phones, otherwise it
 * reserves the width of "Saved"; the inset follows that.
 */
export function Ribbon({ drop = false }: { drop?: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={`ribbon absolute top-0 right-8 h-5 w-3 xs:right-12 ${drop ? "ribbon-drop" : ""}`}
		/>
	);
}
