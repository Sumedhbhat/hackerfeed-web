/**
 * The brass bookmark that hangs from the top of a saved row, centred over the
 * row's Save button. Its parent must be `relative` and keep Save at the far
 * right: 16px in on phones (a 44px icon button), and pulled 8px into the 24px
 * gutter from `sm` up, where the button reserves the width of "Saved".
 */
export function Ribbon() {
	return (
		<span
			aria-hidden="true"
			className="ribbon absolute top-0 right-8 h-5 w-3 sm:right-12"
		/>
	);
}
