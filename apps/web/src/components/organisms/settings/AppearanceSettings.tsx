import type {
	Palette,
	PaletteInput,
	ThemeMode,
} from "@hackerfeed/contracts/appearance";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { PaletteSwatch } from "@hackerfeed/ui/atoms/PaletteSwatch";
import { PanelSection } from "@hackerfeed/ui/atoms/PanelSection";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { useShowToast } from "@hackerfeed/ui/atoms/Toast";
import { ToggleGroup, ToggleGroupItem } from "@hackerfeed/ui/atoms/Toggle";
import { ConfirmButton } from "@hackerfeed/ui/molecules/ConfirmButton";
import { IconHeading } from "@hackerfeed/ui/molecules/IconHeading";
import {
	PaletteOption,
	PaletteOptionList,
} from "@hackerfeed/ui/molecules/PaletteOption";
import { Palette as PaletteIcon, SunMoon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppearance, usePalettes } from "#/hooks/useAppearance";
import { PaletteEditor } from "./PaletteEditor";
import { swatchColors } from "./swatch-colors";

/** Settings section for the mode and the palette, both saved to the account. */
export function AppearanceSettings() {
	const { mode, palette: current, setMode, setPalette } = useAppearance();
	const { palettes, save, remove } = usePalettes();
	const showToast = useShowToast();
	const [editing, setEditing] = useState<Palette | "new" | null>(null);

	// Closing the editor or deleting a palette removes the focused control.
	const newPaletteRef = useRef<HTMLButtonElement>(null);
	const [focusNewPalette, setFocusNewPalette] = useState(false);
	useEffect(() => {
		if (!focusNewPalette || !newPaletteRef.current) return;
		newPaletteRef.current.focus();
		setFocusNewPalette(false);
	}, [focusNewPalette]);

	function closeEditor() {
		setEditing(null);
		setFocusNewPalette(true);
	}

	function savePalette(input: PaletteInput) {
		const id = editing && editing !== "new" ? editing.id : undefined;
		save.mutate(
			{ ...input, id },
			{
				onSuccess(saved) {
					if (!id || id === current.id) setPalette(saved);
					showToast({ title: `Saved ${saved.name}` });
					closeEditor();
				},
			},
		);
	}

	function deletePalette(palette: Palette) {
		remove.mutate(palette.id, {
			onSuccess() {
				if (editing !== "new" && editing?.id === palette.id) setEditing(null);
				showToast({ title: `Deleted ${palette.name}` });
				setFocusNewPalette(true);
			},
		});
	}

	return (
		<Stack gap="lg">
			<Stack gap="md" align="start">
				<IconHeading icon={SunMoon} id="appearance-mode-heading">
					Mode
				</IconHeading>
				<ToggleGroup
					value={mode}
					onValueChange={(next: ThemeMode) => setMode(next)}
					layout="segmented"
					aria-labelledby="appearance-mode-heading"
				>
					<ToggleGroupItem variant="segment" value="light">
						Light
					</ToggleGroupItem>
					<ToggleGroupItem variant="segment" value="dark">
						Dark
					</ToggleGroupItem>
					<ToggleGroupItem variant="segment" value="auto">
						Match system
					</ToggleGroupItem>
				</ToggleGroup>
			</Stack>

			<PanelSection aria-labelledby="appearance-palette-heading">
				<Stack gap="md">
					<Stack gap="sm">
						<IconHeading icon={PaletteIcon} id="appearance-palette-heading">
							Palette
						</IconHeading>
						<Text tone="soft" relaxed>
							Each palette has a light and a dark side. Your choice is saved to
							your account and follows you to every device.
						</Text>
					</Stack>

					<PaletteOptionList aria-labelledby="appearance-palette-heading">
						{palettes.map((palette) => (
							<PaletteOption
								key={palette.id}
								name={palette.name}
								selected={palette.id === current.id}
								onSelect={() => setPalette(palette)}
								swatch={<PaletteSwatch {...swatchColors(palette)} />}
								actions={
									palette.builtIn ? undefined : (
										<>
											<Button
												variant="quiet"
												aria-label={`Edit ${palette.name}`}
												onClick={() => setEditing(palette)}
											>
												Edit
											</Button>
											<ConfirmButton
												variant="quiet"
												triggerLabel={`Delete ${palette.name}`}
												title={`Delete ${palette.name}?`}
												description="This palette is removed from your account on every device."
												confirmLabel="Delete"
												onConfirm={() => deletePalette(palette)}
											>
												Delete
											</ConfirmButton>
										</>
									)
								}
							/>
						))}
					</PaletteOptionList>

					{editing ? null : (
						<Row>
							<Button
								variant="soft"
								ref={newPaletteRef}
								onClick={() => setEditing("new")}
							>
								New palette
							</Button>
						</Row>
					)}
				</Stack>
			</PanelSection>

			{editing ? (
				<PaletteEditor
					key={editing === "new" ? "new" : editing.id}
					palette={editing === "new" ? undefined : editing}
					saving={save.isPending}
					onSave={savePalette}
					onCancel={closeEditor}
				/>
			) : null}
		</Stack>
	);
}
