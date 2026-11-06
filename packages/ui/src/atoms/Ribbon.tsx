/**
 * The brass bookmark that hangs from the top-right corner of a saved row. Its
 * parent must be `relative`; the inset lines it up over the row's Save button.
 */
export function Ribbon() {
	return (
		<span
			aria-hidden="true"
			className="ribbon absolute top-0 right-6 h-5 w-3 sm:right-8"
		/>
	);
}
