import { Check, ChevronDown, Copy } from "lucide-react";
import { Button } from "#/components/atoms/Button";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/atoms/Collapsible";
import { Icon } from "#/components/atoms/Icon";

/**
 * "Details" under an error message: the ID to quote when reporting it, and
 * the browser trace when it differs.
 */
export function ErrorDetails({
	errorId,
	browserTraceId,
	open,
	onOpenChange,
	copied,
	onCopy,
}: {
	errorId: string;
	browserTraceId?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	copied: boolean;
	onCopy: () => void;
}) {
	return (
		<Collapsible open={open} onOpenChange={onOpenChange}>
			<CollapsibleTrigger>
				Details <Icon icon={ChevronDown} />
			</CollapsibleTrigger>
			<CollapsiblePanel>
				<div className="mt-2 flex flex-col gap-2 text-xs">
					<div className="flex items-center gap-2">
						<span>
							Error ID:{" "}
							<code className="select-all wrap-anywhere text-(--sea-ink)">
								{errorId}
							</code>
						</span>
						<Button
							variant="icon"
							aria-label={copied ? "Error ID copied" : "Copy error ID"}
							onClick={onCopy}
						>
							<Icon icon={copied ? Check : Copy} />
						</Button>
					</div>
					{browserTraceId && browserTraceId !== errorId ? (
						<span>
							Browser trace:{" "}
							<code className="select-all wrap-anywhere">{browserTraceId}</code>
						</span>
					) : null}
				</div>
			</CollapsiblePanel>
		</Collapsible>
	);
}
