import { ArrowUp, Square } from "lucide-react";
import type { FormEvent } from "react";
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
	const submit = (event: FormEvent) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form
			onSubmit={submit}
			className="flex items-end gap-2 rounded-xl border border-(--field-line) bg-(--surface-strong) p-2 focus-within:border-(--lagoon) focus-within:outline-2 focus-within:outline-(--lagoon)"
		>
			<label htmlFor={id} className="sr-only">
				Message
			</label>
			<TextArea
				id={id}
				variant="bare"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.shiftKey) submit(event);
				}}
				maxLength={maxLength}
				rows={2}
				placeholder={placeholder}
			/>
			{isStreaming ? (
				<Button variant="secondary" onClick={onStop}>
					<Icon icon={Square} size={14} filled /> Stop
				</Button>
			) : (
				<Button type="submit" disabled={!value.trim()}>
					<Icon icon={ArrowUp} /> Send
				</Button>
			)}
		</form>
	);
}
