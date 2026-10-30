import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { TRPCClientError } from "@trpc/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const CLIENT_TRACE_ID = "0123456789abcdef0123456789abcdef";
const SERVER_TRACE_ID = "fedcba9876543210fedcba9876543210";

vi.mock("#/lib/logger", () => ({
	logger: { error: vi.fn(() => CLIENT_TRACE_ID), warn: vi.fn() },
}));

import { ToastProvider } from "#/components/atoms/Toast";
import { reportError } from "#/lib/errors/report-error";
import { ErrorNotifications } from "./ErrorNotifications";

function serverError() {
	return new TRPCClientError("INTERNAL_SERVER_ERROR", {
		result: { error: { data: { httpStatus: 500 } } } as never,
		meta: {
			response: new Response(null, {
				status: 500,
				headers: { "x-sentry-trace-id": SERVER_TRACE_ID },
			}),
		},
	});
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("ErrorNotifications", () => {
	it("shows a reported error as a toast with the IDs behind Details", async () => {
		const writeText = vi.fn(async () => undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
		render(
			<ToastProvider>
				<ErrorNotifications />
			</ToastProvider>,
		);

		act(() => {
			reportError("Favorite save failed", serverError(), { action: "save" });
		});

		// High-priority toasts are announced from a separate live region, so
		// the message appears twice and the visible toast is aria-hidden.
		expect(
			screen.getAllByRole("button", { name: /details/i, hidden: true }),
		).toHaveLength(1);
		expect(
			await screen.findAllByText("Sorry, we couldn't save this."),
		).not.toHaveLength(0);
		expect(screen.queryByText(SERVER_TRACE_ID)).toBeNull();

		fireEvent.click(
			screen.getByRole("button", { name: /details/i, hidden: true }),
		);

		expect(await screen.findByText(SERVER_TRACE_ID)).toBeTruthy();
		expect(screen.getByText(CLIENT_TRACE_ID)).toBeTruthy();

		fireEvent.click(
			screen.getByRole("button", { name: "Copy error ID", hidden: true }),
		);

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Error ID copied", hidden: true }),
			).toBeTruthy(),
		);
		expect(writeText).toHaveBeenCalledWith(SERVER_TRACE_ID);
	});

	it("does not toast errors reported with notify: false", async () => {
		render(
			<ToastProvider>
				<ErrorNotifications />
			</ToastProvider>,
		);

		act(() => {
			reportError("Feed load failed", serverError(), {
				action: "load",
				notify: false,
			});
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(screen.queryByText("Sorry, we couldn't load this.")).toBeNull();
	});
});
