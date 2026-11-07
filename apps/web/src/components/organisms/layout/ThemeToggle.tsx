import { Button } from "@hackerfeed/ui/atoms/Button";
import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "#/hooks/useTheme";

const MODE_NAMES = { auto: "Automatic", light: "Light", dark: "Dark" } as const;

/** Switches between light and dark (it starts on automatic); says which theme it switched to. */
export default function ThemeToggle() {
	const { mode, toggleMode } = useTheme();
	const name = MODE_NAMES[mode as keyof typeof MODE_NAMES] ?? mode;

	// A changed name on the focused button isn't announced everywhere, so
	// also say the new theme in a status message (WCAG 4.1.3).
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
				onClick={toggleMode}
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
