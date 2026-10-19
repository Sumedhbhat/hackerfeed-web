import { describe, expect, it, vi } from "vitest";
import { createD1Database, type D1DatabaseBinding } from "#/platform/d1";
import { createAiProviderRepository } from "./repository";

type CapturedStatement = { sql: string; values: unknown[] };

function createDatabase(rows: unknown[][] = []) {
	const statements: CapturedStatement[] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					const statement = {
						sql,
						values,
						run: vi.fn().mockResolvedValue({ success: true }),
						raw: vi.fn().mockResolvedValue(rows),
						all: vi.fn().mockResolvedValue({ results: [] }),
					};
					statements.push(statement);
					return statement;
				},
			};
		},
	} as unknown as D1DatabaseBinding;

	return { database: createD1Database(binding), statements };
}

const providerRow = [
	"chatgpt",
	"ChatGPT",
	"Use your ChatGPT plan.",
	"https://chatgpt.com/settings/usage",
	1,
	0,
	"2026-10-15",
	"2026-10-15",
];

const connectionRow = [
	"conn-1",
	"user-1",
	"chatgpt",
	"oaiapp_1",
	'{"hostId":"h"}',
	"sub-1",
	"reader@example.com",
	"Reader",
	"v1.a",
	"v1.r",
	123,
	"openid",
	"2026-10-15",
	"2026-10-15",
];

const connection = {
	clientId: "oaiapp_1",
	registrationMetadata: '{"hostId":"h"}',
	subject: "sub-1",
	email: "reader@example.com",
	name: "Reader",
	accessToken: "v1.sealed-access",
	refreshToken: "v1.sealed-refresh",
	accessTokenExpiresAt: 1_800_000_000_000,
	scopes: "openid",
};

describe("AI provider repository", () => {
	it("lists enabled providers in display order", async () => {
		const { database, statements } = createDatabase([providerRow]);

		const providers =
			await createAiProviderRepository(database).listEnabledProviders();

		const sql = statements[0]?.sql ?? "";
		expect(sql).toContain('from "ai_providers"');
		expect(sql).toContain('where "ai_providers"."enabled" = ?');
		expect(sql).toContain(
			'order by "ai_providers"."sortOrder" asc, "ai_providers"."name" asc',
		);
		expect(statements[0]?.values).toContain(1);
		expect(providers).toEqual([
			expect.objectContaining({
				id: "chatgpt",
				name: "ChatGPT",
				enabled: true,
				manageUrl: "https://chatgpt.com/settings/usage",
			}),
		]);
	});

	it("finds one enabled provider", async () => {
		const { database, statements } = createDatabase([providerRow]);

		const provider =
			await createAiProviderRepository(database).findEnabledProvider("chatgpt");

		expect(statements[0]?.sql).toContain(
			'where ("ai_providers"."id" = ? and "ai_providers"."enabled" = ?)',
		);
		expect(statements[0]?.values).toEqual(
			expect.arrayContaining(["chatgpt", 1]),
		);
		expect(provider?.id).toBe("chatgpt");
	});

	it("returns null for unknown providers", async () => {
		const { database } = createDatabase([]);

		await expect(
			createAiProviderRepository(database).findEnabledProvider("nope"),
		).resolves.toBeNull();
	});

	it("lists a user's connections", async () => {
		const { database, statements } = createDatabase([connectionRow]);

		const connections =
			await createAiProviderRepository(database).listConnections("user-1");

		expect(statements[0]?.sql).toContain('from "ai_provider_connections"');
		expect(statements[0]?.values).toEqual(["user-1"]);
		expect(connections[0]).toMatchObject({
			providerId: "chatgpt",
			clientId: "oaiapp_1",
			registrationMetadata: '{"hostId":"h"}',
		});
	});

	it("finds a connection by user and provider", async () => {
		const { database, statements } = createDatabase([connectionRow]);

		const found = await createAiProviderRepository(database).findConnection(
			"user-1",
			"chatgpt",
		);

		expect(statements[0]?.sql).toContain(
			'"ai_provider_connections"."appUserId" = ? and "ai_provider_connections"."providerId" = ?',
		);
		expect(statements[0]?.values).toEqual(
			expect.arrayContaining(["user-1", "chatgpt"]),
		);
		expect(found?.accessTokenExpiresAt).toBe(123);
	});

	it("upserts connections per user and provider", async () => {
		const { database, statements } = createDatabase();

		await createAiProviderRepository(database).saveConnection(
			"user-1",
			"chatgpt",
			connection,
		);

		const sql = statements[0]?.sql ?? "";
		expect(sql).toContain('insert into "ai_provider_connections"');
		expect(sql).toContain(
			'on conflict ("ai_provider_connections"."appUserId", "ai_provider_connections"."providerId") do update',
		);
		expect(statements[0]?.values).toEqual(
			expect.arrayContaining([
				"user-1",
				"chatgpt",
				"oaiapp_1",
				"v1.sealed-access",
			]),
		);
	});

	it("updates tokens for one user's provider", async () => {
		const { database, statements } = createDatabase();

		await createAiProviderRepository(database).updateTokens(
			"user-1",
			"chatgpt",
			{
				accessToken: "v1.new",
				refreshToken: null,
				accessTokenExpiresAt: 99,
				scopes: "openid",
			},
		);

		expect(statements[0]?.sql).toContain('update "ai_provider_connections"');
		expect(statements[0]?.values).toEqual(
			expect.arrayContaining([
				"v1.new",
				null,
				99,
				"openid",
				"user-1",
				"chatgpt",
			]),
		);
	});

	it("clears tokens but keeps the registration", async () => {
		const { database, statements } = createDatabase();

		await createAiProviderRepository(database).clearTokens("user-1", "chatgpt");

		const sql = statements[0]?.sql ?? "";
		expect(sql).toContain('"accessToken" = ?, "refreshToken" = ?');
		expect(sql).not.toContain('"clientId"');
		expect(sql).not.toContain('"registrationMetadata"');
		expect(statements[0]?.values).toEqual([
			null,
			null,
			null,
			"",
			"user-1",
			"chatgpt",
		]);
	});
});
