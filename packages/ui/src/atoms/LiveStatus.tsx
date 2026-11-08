/** Keep it mounted and change its text: a live region that mounts with its message announces nothing. */
export function LiveStatus({ message }: { message: string }) {
	return (
		<output aria-live="polite" className="sr-only">
			{message}
		</output>
	);
}
