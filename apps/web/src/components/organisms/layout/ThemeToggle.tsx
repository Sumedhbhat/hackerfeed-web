import { Button } from "@hackerfeed/ui/atoms/Button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "#/hooks/useTheme";

export default function ThemeToggle() {
	const { mode, toggleMode } = useTheme();

	const label = `Theme mode: ${mode}. Click to switch mode.`;

	return (
		<Button
			variant="icon"
			onClick={toggleMode}
			aria-label={label}
			title={label}
		>
			{mode === "dark" ? (
				<Moon size={16} aria-hidden="true" />
			) : (
				<Sun size={16} aria-hidden="true" />
			)}
		</Button>
	);
}
