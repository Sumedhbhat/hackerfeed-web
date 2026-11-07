import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, useEffect, useRef } from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { TextArea } from "../atoms/TextField";

/** Message box with a Send button, or a Stop button while a reply streams in. */
export function ChatComposer({
	id,
	value,
	onChange,
	onSubmit,
	onStop,
	isStreaming,
	maxLength,
	placeholder,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	isStreaming: boolean;
	maxLength?: number;
	placeholder?: string;
}) {
	// Send and Stop are the same button. When a reply ends it becomes a
	// disabled Send (the box is empty), which drops keyboard focus to the
	// page without a blur event; put it back in the message box (WCAG 2.4.3).
	const actionFocusedRef = useRef(false);
	useEffect(() => {
		if (!isStreaming && actionFocusedRef.current) {
			actionFocusedRef.current = false;
			document.getElementById(id)?.focus();
		}
	}, [isStreaming, id]);
	const trackFocus = {
		onFocus: () => {
			actionFocusedRef.current = true;
		},
		onBlur: () => {
			actionFocusedRef.current = false;
		},
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form
			onSubmit={submit}
			className="flex items-end gap-2 rounded-xl border border-(--field-line) bg-(--surface-strong) p-2 focus-within:border-(--lagoon) focus-within:outline-1 focus-within:outline-(--lagoon)"
		>
			<label htmlFor={id} className="sr-only">
				Message
			</label>
			<span id={`${id}-keys`} className="sr-only">
				Enter sends. Shift+Enter adds a new line.
			</span>
			<TextArea
				id={id}
				variant="bare"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				aria-describedby={`${id}-keys`}
				onKeyDown={(event) => {
					// Enter while an IME is composing (Japanese, Chinese, Korean) picks a
					// candidate; it must not send a half-typed message.
					if (
						event.key === "Enter" &&
						!event.shiftKey &&
						!event.nativeEvent.isComposing
					)
						submit(event);
				}}
				maxLength={maxLength}
				rows={2}
				placeholder={placeholder}
			/>
			{isStreaming ? (
				<Button variant="secondary" onClick={onStop} {...trackFocus}>
					<Icon icon={Square} size={14} filled /> Stop
				</Button>
			) : (
				<Button type="submit" disabled={!value.trim()} {...trackFocus}>
					<Icon icon={ArrowUp} /> Send
				</Button>
			)}
		</form>
	);
}
