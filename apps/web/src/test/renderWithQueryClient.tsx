import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

export function renderWithQueryClient(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrap = (children: ReactNode) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const view = render(wrap(ui));
	return {
		...view,
		queryClient,
		rerender: (nextUi: ReactNode) => view.rerender(wrap(nextUi)),
	};
}
