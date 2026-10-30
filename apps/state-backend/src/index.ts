/**
 * Terraform state server for the roots in infra/, speaking Terraform's `http`
 * backend protocol. State and locks live in D1.
 *
 * Callers sign in with a GitHub Actions OIDC token as the basic-auth password.
 * The token's GitHub environment decides what it may touch:
 *   production: the prod and deploy states.
 *   preview:    read-only access to prod for PR plans and the preview token.
 *
 * deploy holds production-only tokens, so PR jobs must never read it.
 *
 *   GET    /states/:name         read
 *   POST   /states/:name?ID=...  write (ID is the caller's lock)
 *   DELETE /states/:name         delete
 *   POST   /states/:name/lock    lock
 *   DELETE /states/:name/lock    unlock
 */
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

type Env = {
	DB: D1Database;
	AUDIENCE: string;
	GITHUB_REPOSITORY_ID: string;
	JWKS_URL: string;
};

type Access = "read" | "write";

type GitHubClaims = JWTPayload & {
	repository_id?: string;
	environment?: string;
};

const ISSUER = "https://token.actions.githubusercontent.com";
const STATE_NAME = /^(prod|deploy)$/;

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function allowed(
	environment: string | undefined,
	name: string,
	access: Access,
) {
	if (name === "prod") {
		return (
			environment === "production" ||
			(environment === "preview" && access === "read")
		);
	}
	if (name === "deploy") return environment === "production";
	return false;
}

async function verify(request: Request, env: Env) {
	const header = request.headers.get("authorization") ?? "";
	if (!header.startsWith("Basic ")) return undefined;

	const credentials = atob(header.slice("Basic ".length));
	const token = credentials.slice(credentials.indexOf(":") + 1);
	jwks ??= createRemoteJWKSet(new URL(env.JWKS_URL));
	try {
		const { payload } = await jwtVerify<GitHubClaims>(token, jwks, {
			issuer: ISSUER,
			audience: env.AUDIENCE,
			algorithms: ["RS256"],
		});
		return payload.repository_id === env.GITHUB_REPOSITORY_ID
			? payload
			: undefined;
	} catch {
		return undefined;
	}
}

function locked(lockInfo: string | null) {
	return new Response(lockInfo ?? "{}", {
		status: 423,
		headers: { "content-type": "application/json" },
	});
}

async function currentLock(db: D1Database, name: string) {
	const row = await db
		.prepare("SELECT lock_info FROM states WHERE name = ?")
		.bind(name)
		.first<{ lock_info: string | null }>();
	return row?.lock_info ?? null;
}

async function handleState(request: Request, db: D1Database, name: string) {
	switch (request.method) {
		case "GET": {
			const row = await db
				.prepare("SELECT state FROM states WHERE name = ?")
				.bind(name)
				.first<{ state: string | null }>();
			if (!row?.state) return new Response(null, { status: 404 });
			return new Response(row.state, {
				headers: { "content-type": "application/json" },
			});
		}
		case "POST": {
			const lockId = new URL(request.url).searchParams.get("ID");
			const result = await db
				.prepare(
					`INSERT INTO states (name, state, updated_at) VALUES (?1, ?2, ?3)
					ON CONFLICT (name) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
					WHERE states.lock_id IS NULL OR states.lock_id = ?4`,
				)
				.bind(name, await request.text(), new Date().toISOString(), lockId)
				.run();
			if (result.meta.changes === 0) return locked(await currentLock(db, name));
			return new Response(null, { status: 200 });
		}
		case "DELETE": {
			const result = await db
				.prepare("DELETE FROM states WHERE name = ? AND lock_id IS NULL")
				.bind(name)
				.run();
			const held =
				result.meta.changes === 0 ? await currentLock(db, name) : null;
			if (held) return locked(held);
			return new Response(null, { status: 200 });
		}
		default:
			return new Response(null, { status: 405 });
	}
}

function parseLockId(lockInfo: string) {
	try {
		return (JSON.parse(lockInfo) as { ID?: unknown }).ID;
	} catch {
		return undefined;
	}
}

async function handleLock(request: Request, db: D1Database, name: string) {
	const lockInfo = await request.text();
	const lockId = parseLockId(lockInfo);

	// `terraform force-unlock` sends no body: it clears whoever holds the lock.
	if (request.method === "DELETE" && !lockInfo) {
		await db
			.prepare(
				"UPDATE states SET lock_id = NULL, lock_info = NULL WHERE name = ?",
			)
			.bind(name)
			.run();
		return new Response(null, { status: 200 });
	}
	if (typeof lockId !== "string" || !lockId) {
		return new Response("Lock body has no ID", { status: 400 });
	}

	switch (request.method) {
		case "POST": {
			// A retry after a lost commit response must succeed for the same ID.
			// Preserve its original metadata while excluding every other owner.
			const result = await db
				.prepare(
					`INSERT INTO states (name, lock_id, lock_info) VALUES (?1, ?2, ?3)
					ON CONFLICT (name) DO UPDATE SET lock_id = excluded.lock_id,
					lock_info = CASE WHEN states.lock_id IS NULL THEN excluded.lock_info ELSE states.lock_info END
					WHERE states.lock_id IS NULL OR states.lock_id = excluded.lock_id`,
				)
				.bind(name, lockId, lockInfo)
				.run();
			if (result.meta.changes === 0) return locked(await currentLock(db, name));
			return new Response(null, { status: 200 });
		}
		case "DELETE": {
			const result = await db
				.prepare(
					"UPDATE states SET lock_id = NULL, lock_info = NULL WHERE name = ? AND lock_id = ?",
				)
				.bind(name, lockId)
				.run();
			const held =
				result.meta.changes === 0 ? await currentLock(db, name) : null;
			if (held) return locked(held);
			return new Response(null, { status: 200 });
		}
		default:
			return new Response(null, { status: 405 });
	}
}

export default {
	async fetch(request, env) {
		const [, root, name, lock, ...rest] = new URL(request.url).pathname.split(
			"/",
		);
		if (root !== "states" || !name || !STATE_NAME.test(name) || rest.length) {
			return new Response(null, { status: 404 });
		}
		if (lock !== undefined && lock !== "lock") {
			return new Response(null, { status: 404 });
		}

		const claims = await verify(request, env);
		if (!claims) return new Response(null, { status: 401 });

		const access: Access = request.method === "GET" ? "read" : "write";
		if (!allowed(claims.environment, name, access)) {
			return new Response(null, { status: 403 });
		}

		return lock
			? handleLock(request, env.DB, name)
			: handleState(request, env.DB, name);
	},
} satisfies ExportedHandler<Env>;
