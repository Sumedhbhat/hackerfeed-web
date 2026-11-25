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
import { seedWorld } from "./world";

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
 * - `world`: the database already holding readers (`world.alice`, `world.bob`),
 *   shared stories and papers, and their saves, reads and appearance
 *   (`support/world.ts`). For a different one, call `seedWorld(ctx, changes)`.
 *
 * Asking for any of them turns the fakes on, so `fetch` never leaves them;
 * the local D1 boots only for `database` or `api`.
 * For a table of cases use `test.for(rows)(name, INTEGRATION, (row, ctx) => …)`;
 * `test.each` doesn't pass fixtures.
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
	.extend("api", ({ database: _, workos }) => createTestApi(workos))
	.extend("world", ({ api, database, huggingFace }) =>
		seedWorld({ api, database, huggingFace }),
	);
