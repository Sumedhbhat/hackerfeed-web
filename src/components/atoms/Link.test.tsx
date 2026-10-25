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
	it("keep their own classes when the router marks them active", async () => {
		renderAt("/");
		const [brand, feed] = await screen.findAllByRole("link");
		expect(brand.getAttribute("data-status")).toBe("active");
		expect(brand.className).toContain("flex");
		expect(feed.className).toContain("nav-link");
	});
});
