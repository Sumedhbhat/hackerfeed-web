import { describe, expect, it, vi } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createChatGptConnectionRepository } from "./repository";

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

	return { database: createDatabaseContext(binding), statements };
}

const connection = {
	clientId: "oaiapp_1",
	hostId: "urn:uuid:host",
	subject: "sub-1",
	email: "reader@example.com",
	name: "Reader",
	accessToken: "v1.sealed-access",
	refreshToken: "v1.sealed-refresh",
	accessTokenExpiresAt: 1_800_000_000_000,
	scopes: "openid chatgpt.tokens.use.direct",
};

describe("chatgpt connection repository", () => {
	it("finds a connection by app user id", async () => {
		const { database, statements } = createDatabase([
			[
				"id-1",
				"user-1",
				"oaiapp_1",
				"urn:uuid:host",
				"sub-1",
				"reader@example.com",
				"Reader",
				"v1.a",
				"v1.r",
				123,
				"openid",
				"2026-10-15",
				"2026-10-15",
			],
		]);

		const found =
			await createChatGptConnectionRepository(database).findByAppUserId(
				"user-1",
			);

		expect(statements[0]?.sql).toContain('from "chatgpt_connections"');
		expect(statements[0]?.sql).toContain(
			'"chatgpt_connections"."appUserId" = ?',
		);
		expect(statements[0]?.values).toContain("user-1");
		expect(found).toMatchObject({
			appUserId: "user-1",
			clientId: "oaiapp_1",
			accessToken: "v1.a",
			accessTokenExpiresAt: 123,
		});
	});

	it("returns null when there's no connection", async () => {
		const { database } = createDatabase([]);

		await expect(
			createChatGptConnectionRepository(database).findByAppUserId("user-1"),
		).resolves.toBeNull();
	});

	it("upserts on the app user id", async () => {
		const { database, statements } = createDatabase();

		await createChatGptConnectionRepository(database).save(
			"user-1",
			connection,
		);

		expect(statements[0]?.sql).toContain('insert into "chatgpt_connections"');
		expect(statements[0]?.sql).toContain(
			'on conflict ("chatgpt_connections"."appUserId") do update',
		);
		expect(statements[0]?.values).toEqual(
			expect.arrayContaining(["user-1", "oaiapp_1", "v1.sealed-access"]),
		);
	});

	it("updates tokens for one user", async () => {
		const { database, statements } = createDatabase();

		await createChatGptConnectionRepository(database).updateTokens("user-1", {
			accessToken: "v1.new",
			refreshToken: null,
			accessTokenExpiresAt: 99,
			scopes: "openid",
		});

		expect(statements[0]?.sql).toContain('update "chatgpt_connections"');
		expect(statements[0]?.sql).toContain(
			'where "chatgpt_connections"."appUserId" = ?',
		);
		expect(statements[0]?.values).toEqual(
			expect.arrayContaining(["v1.new", null, 99, "openid", "user-1"]),
		);
	});

	it("clears tokens but keeps the registration", async () => {
		const { database, statements } = createDatabase();

		await createChatGptConnectionRepository(database).clearTokens("user-1");

		const sql = statements[0]?.sql ?? "";
		expect(sql).toContain('update "chatgpt_connections"');
		expect(sql).toContain('"accessToken" = ?, "refreshToken" = ?');
		expect(sql).not.toContain('"clientId"');
		expect(sql).not.toContain('"hostId"');
		expect(statements[0]?.values).toEqual([null, null, null, "", "user-1"]);
	});
});
