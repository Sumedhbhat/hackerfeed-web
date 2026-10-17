import type { ButtonHTMLAttributes } from "react";

const TAB_CLASSES =
	"relative inline-flex cursor-pointer items-center pb-3 text-sm font-medium text-(--sea-ink-soft) transition-colors hover:text-(--sea-ink) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--lagoon) after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-full after:scale-x-0 after:bg-(--lagoon) aria-pressed:text-(--sea-ink) aria-pressed:after:scale-x-100 aria-selected:text-(--sea-ink) aria-selected:after:scale-x-100";

type TabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

/** Selected state is driven by the caller's `aria-selected` or `aria-pressed`. */
export function Tab({ type = "button", ...props }: TabProps) {
	return <button type={type} className={TAB_CLASSES} {...props} />;
}
