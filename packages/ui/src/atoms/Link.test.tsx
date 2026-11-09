import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandLink } from "./BrandLink";
import { TextLink } from "./Link";

afterEach(cleanup);

function renderAt(path: string) {
	const rootRoute = createRootRoute({
		component: () => (
			<>
				<BrandLink to="/" />
				<TextLink to="/" variant="nav">
					Feed
				</TextLink>
				<TextLink to="/saved" variant="nav">
					Saved
				</TextLink>
			</>
		),
	});
	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: [path] }),
	});
	render(<RouterProvider router={router} />);
}

describe("router link atoms", () => {
	it("mark only the current page's links as the current page", async () => {
		renderAt("/");
		const brand = await screen.findByRole("link", { name: "HackerFeed" });
		expect(brand.getAttribute("aria-current")).toBe("page");
		expect(
			screen.getByRole("link", { name: "Feed" }).getAttribute("aria-current"),
		).toBe("page");
		const saved = screen.getByRole("link", { name: "Saved" });
		expect(saved.getAttribute("href")).toBe("/saved");
		expect(saved.getAttribute("aria-current")).toBeNull();
	});
});
