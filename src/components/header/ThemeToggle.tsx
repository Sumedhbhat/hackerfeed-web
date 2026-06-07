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
			className="rounded-full border border-(--chip-line) bg-(--chip-bg) p-1.5 text-(--sea-ink) shadow-[0_8px_22px_rgba(30,90,72,0.08)] transition hover:-translate-y-0.5"
		>
			{mode === "dark" ? (
				<Moon size={16} aria-hidden="true" />
			) : (
				<Sun size={16} aria-hidden="true" />
			)}
		</button>
	);
}
