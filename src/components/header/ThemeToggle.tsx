import { Moon, Sun } from "lucide-react";
import { useTheme } from "#/hooks/useTheme";

export default function ThemeToggle() {
	const { mode, toggleMode } = useTheme();

	const label = `Theme mode: ${mode}. Click to switch mode.`;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="flex h-8 w-8 items-center justify-center rounded-full border border-(--chip-line) bg-(--chip-bg) text-(--sea-ink) hover:bg-(--link-bg-hover)"
		>
			{mode === "dark" ? (
				<Moon size={16} aria-hidden="true" />
			) : (
				<Sun size={16} aria-hidden="true" />
			)}
		</button>
	);
}
