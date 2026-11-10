import type {
	Palette,
	PaletteBaseRole,
	PaletteInput,
} from "@hackerfeed/contracts/appearance";
import { Button } from "@hackerfeed/ui/atoms/Button";
import { Field, FieldError, FieldLabel } from "@hackerfeed/ui/atoms/Field";
import { Heading } from "@hackerfeed/ui/atoms/Heading";
import { PalettePreview } from "@hackerfeed/ui/atoms/PaletteSwatch";
import { PanelSection } from "@hackerfeed/ui/atoms/PanelSection";
import { Row } from "@hackerfeed/ui/atoms/Row";
import { Stack } from "@hackerfeed/ui/atoms/Stack";
import { Text } from "@hackerfeed/ui/atoms/Text";
import { TextInput } from "@hackerfeed/ui/atoms/TextField";
import { ToggleGroup, ToggleGroupItem } from "@hackerfeed/ui/atoms/Toggle";
import { ColorField } from "@hackerfeed/ui/molecules/ColorField";
import { useState } from "react";
import { derivePalette } from "#/lib/appearance/derive-palette";
import { swatchColors } from "./swatch-colors";

const NEW_PALETTE: PaletteInput = {
	name: "",
	baseRole: "background",
	baseColor: "#F6F7F4",
	accentColor: "#1E6B52",
};

/** Pick one colour and an accent; every other colour, for both modes, is worked out and previewed live. */
export function PaletteEditor({
	palette,
	saving,
	onSave,
	onCancel,
}: {
	/** The palette being changed; none for a new one. */
	palette?: Palette;
	saving: boolean;
	onSave: (palette: PaletteInput) => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState<PaletteInput>(palette ?? NEW_PALETTE);
	const [nameMissing, setNameMissing] = useState(false);
	const { notes } = derivePalette(draft);
	const picked = draft.baseRole === "background" ? "Background" : "Text";

	function save() {
		const name = draft.name.trim();
		setNameMissing(!name);
		if (name) onSave({ ...draft, name });
	}

	return (
		<PanelSection aria-labelledby="palette-editor-heading">
			<Stack gap="lg">
				<Heading level={3} size="small" id="palette-editor-heading">
					{palette ? `Edit ${palette.name}` : "New palette"}
				</Heading>

				<Field invalid={nameMissing}>
					<FieldLabel>Name</FieldLabel>
					<TextInput
						autoFocus
						value={draft.name}
						maxLength={40}
						onChange={(event) =>
							setDraft({ ...draft, name: event.target.value })
						}
					/>
					{nameMissing ? (
						<FieldError>Give the palette a name.</FieldError>
					) : null}
				</Field>

				<Stack gap="sm" align="start">
					<Text id="palette-base-role">I'm choosing my</Text>
					<ToggleGroup
						value={draft.baseRole}
						onValueChange={(baseRole: PaletteBaseRole) =>
							setDraft({ ...draft, baseRole })
						}
						layout="segmented"
						aria-labelledby="palette-base-role"
					>
						<ToggleGroupItem variant="segment" value="background">
							Background
						</ToggleGroupItem>
						<ToggleGroupItem variant="segment" value="text">
							Text
						</ToggleGroupItem>
					</ToggleGroup>
				</Stack>

				<ColorField
					label={`${picked} colour`}
					value={draft.baseColor}
					onChange={(baseColor) => setDraft({ ...draft, baseColor })}
				/>
				<ColorField
					label="Accent colour"
					value={draft.accentColor}
					onChange={(accentColor) => setDraft({ ...draft, accentColor })}
				/>

				<Stack gap="sm">
					<Text tone="soft" relaxed>
						Everything else is worked out from these two colours, for light and
						dark mode, so text always stays readable.
					</Text>
					<PalettePreview {...swatchColors(draft)} />
					{notes.map((note) => (
						<Text key={note} size="xs" tone="soft">
							Adjusted: {note}
						</Text>
					))}
				</Stack>

				<Row gap="md" wrap>
					<Button busy={saving} onClick={save}>
						Save palette
					</Button>
					<Button variant="secondary" onClick={onCancel}>
						Cancel
					</Button>
				</Row>
			</Stack>
		</PanelSection>
	);
}
