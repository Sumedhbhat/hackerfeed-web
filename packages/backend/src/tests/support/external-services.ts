import { exportJWK, generateKeyPair, type JWK, SignJWT } from "jose";
import { vi } from "vitest";
import { type DailyPapersEntry, dailyPapersEntry } from "./data";

/**
 * Fakes for the services HackerFeed doesn't run. While an integration test
 * runs, `fetch` reaches only these fakes and the local D1; any other request
 * fails the test, so nothing leaves the machine.
 */

type SigningKey = { privateKey: CryptoKey; jwk: JWK };

export async function createSigningKey(kid = "test-key"): Promise<SigningKey> {
	const { privateKey, publicKey } = await generateKeyPair("RS256");
	return {
		privateKey,
		jwk: { ...(await exportJWK(publicKey)), kid, alg: "RS256" },
	};
}

/** WorkOS AuthKit: publishes the JWKS that signs readers' access tokens. */
export function createFakeWorkos(key: SigningKey) {
	const clientId = "client_test";
	const jwksRequests: URL[] = [];

	return {
		clientId,
		apiHostname: "api.workos.com",
		jwksRequests,
		/** An access token AuthKit would issue to this WorkOS user. */
		accessToken(
			workosUserId: string,
			{
				expiresAt = "1h",
				signedWith = key,
			}: { expiresAt?: string | number; signedWith?: SigningKey } = {},
		) {
			return new SignJWT({})
				.setProtectedHeader({ alg: "RS256", kid: signedWith.jwk.kid })
				.setSubject(workosUserId)
				.setIssuedAt()
				.setExpirationTime(expiresAt)
				.sign(signedWith.privateKey);
		},
		handle(request: Request): Response | undefined {
			const url = new URL(request.url);
			if (url.hostname !== "api.workos.com") return undefined;
			if (url.pathname !== `/sso/jwks/${clientId}`) {
				return Response.json({ message: "Not found" }, { status: 404 });
			}
			jwksRequests.push(url);
			return Response.json({ keys: [key.jwk] });
		},
	};
}

/**
 * Hugging Face Daily Papers. Every date serves `DEFAULT_EDITION` unless the
 * test publishes another edition for it or makes the next requests fail.
 */
export function createFakeHuggingFace() {
	const editions = new Map<string, DailyPapersEntry[]>();
	const overrides: Array<() => Response> = [];
	const requests: Request[] = [];

	function respondNext(respond: () => Response, { times = 1 } = {}) {
		for (let index = 0; index < times; index++) overrides.push(respond);
	}

	return {
		requests,
		publish(editionDate: string, entries: DailyPapersEntry[]) {
			editions.set(editionDate, entries);
		},
		/** The next `times` requests get `respond()` (which may throw) instead. */
		respondNext,
		/** The next `times` requests answer `status` before the API recovers. */
		failNext(
			status: number,
			{
				times = 1,
				retryAfter = "0",
			}: { times?: number; retryAfter?: string | null } = {},
		) {
			const headers: HeadersInit =
				retryAfter === null ? {} : { "Retry-After": retryAfter };
			respondNext(
				() => Response.json({ error: "Unavailable" }, { status, headers }),
				{ times },
			);
		},
		handle(request: Request): Response | undefined {
			const url = new URL(request.url);
			if (url.hostname !== "huggingface.co") return undefined;
			if (url.pathname !== "/api/daily_papers") {
				return Response.json({ error: "Not found" }, { status: 404 });
			}
			requests.push(request);
			const override = overrides.shift();
			if (override) return override();
			const editionDate = url.searchParams.get("date") ?? "";
			return Response.json(editions.get(editionDate) ?? DEFAULT_EDITION);
		},
	};
}

export const DEFAULT_EDITION = [
	dailyPapersEntry({ arxivId: "2606.00001", title: "First Paper" }),
	dailyPapersEntry({ arxivId: "2606.00002", title: "Second Paper" }),
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

type ExternalService = { handle(request: Request): Response | undefined };

/** Routes `fetch` to the fakes until the returned function is called. */
export function interceptExternalServices(services: ExternalService[]) {
	const realFetch = globalThis.fetch;
	const spy = vi
		.spyOn(globalThis, "fetch")
		.mockImplementation(async (input, init) => {
			const request = new Request(input, init);
			const url = new URL(request.url);
			if (LOCAL_HOSTS.has(url.hostname)) return realFetch(input, init);
			for (const service of services) {
				const response = service.handle(request);
				if (response) return response;
			}
			throw new Error(
				`${request.method} ${url.origin}${url.pathname} is not faked. Add a fake to src/tests/support/external-services.ts.`,
			);
		});
	return () => spy.mockRestore();
}
