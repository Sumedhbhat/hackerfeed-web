import { ToastProvider } from "@hackerfeed/ui/atoms/Toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

export function renderWithQueryClient(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrap = (children: ReactNode) => (
		<QueryClientProvider client={queryClient}>
			<ToastProvider>{children}</ToastProvider>
		</QueryClientProvider>
	);
	const view = render(wrap(ui));
	return {
		...view,
		queryClient,
		rerender: (nextUi: ReactNode) => view.rerender(wrap(nextUi)),
	};
}
