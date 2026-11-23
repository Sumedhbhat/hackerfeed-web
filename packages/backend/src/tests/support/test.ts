import { test as base, type TestContext } from "vitest";
import {
	createDatabaseContext,
	setDatabaseContext,
} from "../../database/client";
import { createTestApi } from "./api";
import {
	createFakeHuggingFace,
	createFakeWorkos,
	createSigningKey,
	interceptExternalServices,
} from "./external-services";
import { startLocalD1 } from "./local-d1";

export const INTEGRATION = { tags: ["integration"] };

function requireIntegrationTag(task: TestContext["task"]) {
	if (!task.tags?.includes("integration")) {
		throw new Error(
			`"${task.name}" uses integration services. Declare it with test(name, INTEGRATION, fn).`,
		);
	}
}

/**
 * The backend's one test API. A unit test asks for nothing and gets nothing.
 * An integration test (tagged with `INTEGRATION`) asks for what it uses:
 *
 * - `database`: the real schema on a local D1, emptied before each test.
 * - `api`: the API's request handler with real WorkOS token checks;
 *   `api.as("user_1")` is a tRPC client signed in as that reader.
 * - `workos`, `huggingFace`: fakes for those services, with defaults a test
 *   can change (`huggingFace.failNext(503)`, `huggingFace.publish(...)`).
 *
 * Asking for any of them starts all of them, so `fetch` never leaves the fakes.
 */
export const test = base
	// biome-ignore lint/correctness/noEmptyPattern: Vitest reads a fixture's dependencies from its destructured context
	.extend("localD1", { scope: "worker" }, async ({}, { onCleanup }) => {
		const d1 = await startLocalD1();
		onCleanup(() => d1.close());
		return d1;
	})
	.extend("signingKey", { scope: "worker" }, () => createSigningKey())
	.extend("externalServices", ({ signingKey, task }, { onCleanup }) => {
		requireIntegrationTag(task);
		const services = {
			workos: createFakeWorkos(signingKey),
			huggingFace: createFakeHuggingFace(),
		};
		onCleanup(interceptExternalServices(Object.values(services)));
		return services;
	})
	.extend("workos", ({ externalServices }) => externalServices.workos)
	.extend("huggingFace", ({ externalServices }) => externalServices.huggingFace)
	.extend("database", async ({ localD1, externalServices: _ }) => {
		await localD1.wipe();
		const database = createDatabaseContext(localD1.binding);
		setDatabaseContext(database);
		return database;
	})
	.extend("api", ({ database: _, workos }) => createTestApi(workos));
