/**
 * The brass bookmark that hangs from the top of a saved row, centred over the
 * row's Save button. Its parent must be `relative` and keep Save at the far
 * right: 16px in on the narrowest phones (a 44px icon button), otherwise a
 * button that reserves the width of "Saved" (pulled 8px into the gutter from
 * `sm` up), whose centre sits about 54px from the edge.
 */
export function Ribbon() {
	return (
		<span
			aria-hidden="true"
			className="ribbon absolute top-0 right-8 h-5 w-3 min-[380px]:right-12"
		/>
	);
}
