import type { ReactNode } from "react";
import { PageContainer } from "../atoms/PageContainer";

export function PaperPageShell({ children }: { children: ReactNode }) {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4">{children}</div>
		</PageContainer>
	);
}
