/** The few colours of one mode that are enough to recognise a palette. */
export type SwatchColors = {
	paper: string;
	surface: string;
	ink: string;
	inkSoft: string;
	line: string;
	accent: string;
	onAccent: string;
};

type BothModes = { light: SwatchColors; dark: SwatchColors };

/** A palette at a glance: its light side on the left, its dark side on the right. */
export function PaletteSwatch({ light, dark }: BothModes) {
	return (
		<span
			aria-hidden="true"
			className="flex h-10 w-20 shrink-0 overflow-hidden rounded-md border border-muted-line"
		>
			{Object.entries({ light, dark }).map(([scheme, colors]) => (
				<span
					key={scheme}
					className="flex flex-1 items-center justify-center gap-1 text-sm font-semibold"
					style={{ backgroundColor: colors.paper, color: colors.ink }}
				>
					Aa
					<span
						className="h-2.5 w-2.5 rounded-full"
						style={{ backgroundColor: colors.accent }}
					/>
				</span>
			))}
		</span>
	);
}

/** A small mock of the app in each mode, for trying colours before saving them. */
export function PalettePreview({ light, dark }: BothModes) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{(
				[
					["Light mode", light],
					["Dark mode", dark],
				] as const
			).map(([label, colors]) => (
				<div
					key={label}
					className="flex flex-col gap-3 rounded-lg border p-4"
					style={{
						backgroundColor: colors.paper,
						borderColor: colors.line,
						color: colors.ink,
					}}
				>
					<div
						className="text-meta font-semibold"
						style={{ color: colors.accent }}
					>
						{label}
					</div>
					<div
						className="flex flex-col items-start gap-2 rounded-md border p-3"
						style={{
							backgroundColor: colors.surface,
							borderColor: colors.line,
						}}
					>
						<div className="text-read font-semibold">
							A headline in this palette
						</div>
						<div className="text-meta" style={{ color: colors.inkSoft }}>
							Smaller text, such as who posted it and when
						</div>
						<div
							className="rounded-md px-3 py-1.5 text-sm font-medium"
							style={{
								backgroundColor: colors.accent,
								color: colors.onAccent,
							}}
						>
							A button
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
