import { Button } from "@hackerfeed/ui/atoms/Button";
import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppearance } from "#/hooks/useAppearance";

const MODE_NAMES = { auto: "Automatic", light: "Light", dark: "Dark" } as const;

export default function ThemeToggle() {
	const { mode, setMode } = useAppearance();
	const name = MODE_NAMES[mode];

	// A changed name on the focused button isn't announced everywhere, so
	// also say the new theme in a status message.
	const [announcement, setAnnouncement] = useState("");
	const lastModeRef = useRef(mode);
	useEffect(() => {
		if (mode === lastModeRef.current) return;
		lastModeRef.current = mode;
		setAnnouncement(`${name} theme`);
	}, [mode, name]);

	return (
		<>
			<Button
				variant="icon"
				onClick={() => setMode(mode === "light" ? "dark" : "light")}
				aria-label={`Theme: ${name}`}
				title={`Theme: ${name}. Press to change.`}
			>
				{mode === "dark" ? (
					<Moon size={16} aria-hidden="true" />
				) : mode === "light" ? (
					<Sun size={16} aria-hidden="true" />
				) : (
					<SunMoon size={16} aria-hidden="true" />
				)}
			</Button>
			<LiveStatus message={announcement} />
		</>
	);
}
