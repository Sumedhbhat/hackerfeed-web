import type { ReactNode } from "react";
import { PageContainer } from "../atoms/PageContainer";

/** Page column for the papers screen, stacking its sections with even spacing. */
export function PaperPageShell({ children }: { children: ReactNode }) {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4">{children}</div>
		</PageContainer>
	);
}
