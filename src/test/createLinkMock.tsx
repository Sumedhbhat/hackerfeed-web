import type { ComponentType } from "react";

/**
 * Stand-in for TanStack Router's `createLink` in tests that mock the router.
 * Renders the styled anchor with `href={to}` and drops router-only props.
 */
export function createLinkMock<P extends object>(Anchor: ComponentType<P>) {
	return function MockLink({
		to,
		params: _params,
		search: _search,
		activeProps: _activeProps,
		activeOptions: _activeOptions,
		...rest
	}: Record<string, unknown>) {
		return <Anchor {...(rest as P)} href={to as string} />;
	};
}
