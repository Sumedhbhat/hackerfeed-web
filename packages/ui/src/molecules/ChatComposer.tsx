import { ArrowUp, Square } from "lucide-react";
import { type FormEvent, useEffect, useRef } from "react";
import { Button } from "../atoms/Button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "../atoms/Field";
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
	label = "Message",
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	isStreaming: boolean;
	maxLength?: number;
	placeholder?: string;
	label?: string;
}) {
	// Send and Stop are one button. When a reply ends it becomes a disabled
	// Send, which drops focus to <body> without a blur event; put it back in
	// the message box.
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

	// No hard maxLength: a long paste would be cut off silently. Count down
	// near the limit and don't send until it fits.
	const overBy = maxLength === undefined ? 0 : value.length - maxLength;
	const showCount = maxLength !== undefined && value.length > maxLength * 0.9;
	const tooLong = overBy > 0;

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!tooLong) onSubmit();
	};

	return (
		<Field invalid={tooLong}>
			<form
				onSubmit={submit}
				className="flex items-end gap-2 rounded-xl border border-field-line bg-surface p-2 focus-within:border-accent focus-within:outline-1 focus-within:outline-accent"
			>
				<FieldLabel visuallyHidden>{label}</FieldLabel>
				<FieldDescription visuallyHidden>
					Enter sends. Shift+Enter adds a new line.
				</FieldDescription>
				<TextArea
					id={id}
					variant="bare"
					value={value}
					onChange={(event) => onChange(event.target.value)}
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
					rows={2}
					placeholder={placeholder}
				/>
				{isStreaming ? (
					<Button variant="secondary" onClick={onStop} {...trackFocus}>
						<Icon icon={Square} size={14} filled /> Stop
					</Button>
				) : (
					<Button
						type="submit"
						disabled={!value.trim() || tooLong}
						{...trackFocus}
					>
						<Icon icon={ArrowUp} /> Send
					</Button>
				)}
			</form>
			{tooLong ? (
				<FieldError>
					{`${overBy.toLocaleString()} characters over the ${maxLength?.toLocaleString()} limit. Shorten it to send.`}
				</FieldError>
			) : showCount ? (
				<FieldDescription>
					{`${(-overBy).toLocaleString()} characters left`}
				</FieldDescription>
			) : null}
		</Field>
	);
}
