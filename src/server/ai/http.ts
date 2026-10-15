import "@tanstack/react-start/server-only";

import {
	aiProviderIdSchema,
	type ChatStreamEvent,
	storyChatRequestSchema,
} from "#/lib/ai/schemas";
import type {
	HackerNewsCommentRecord,
	HackerNewsStoryRecord,
} from "#/lib/hacker-news/queries";
import { logger } from "#/lib/logger";
import {
	clearCookie,
	getRequestCookie,
	normalizeReturnTo,
	serializeCookie,
} from "#/server/auth/cookies";
import type { AuthenticatedWorkosUser } from "#/server/auth/current-user";
import {
	AiProviderError,
	AiProviderNotConnectedError,
	AiProviderNotFoundError,
} from "./errors";
import type { AiAuthorizationFlow, AiProviderService } from "./service";
import { buildStoryChatInstructions } from "./story-context";
import type { TokenCipher } from "./token-crypto";

const FLOW_COOKIE = "hackerfeed_ai_flow";
const FLOW_MAX_AGE_SECONDS = 60 * 10;
const DEFAULT_RETURN_TO = "/profile";

export function getAiConnectPath(providerId: string) {
	return `/ai/${providerId}/connect`;
}

export function getAiCallbackPath(providerId: string) {
	return `/ai/${providerId}/callback`;
}

type SessionLookup = {
	user: AuthenticatedWorkosUser | null;
	setCookie?: string;
};

export type StoryChatContext = {
	story: HackerNewsStoryRecord;
	comments: HackerNewsCommentRecord[];
};

export type AiHttpDependencies = {
	cipher: TokenCipher;
	getOrigin(request: Request): string;
	getService(): AiProviderService;
	getSession(request: Request): Promise<SessionLookup>;
	getStoryContext(
		storyId: number,
		signal: AbortSignal,
	): Promise<StoryChatContext | null>;
};

function redirect(location: string, headers = new Headers()): Response {
	headers.set("Location", location);
	return new Response(null, { headers, status: 302 });
}

function json(
	body: unknown,
	status: number,
	session?: SessionLookup,
): Response {
	const headers = new Headers({
		"Cache-Control": "no-store",
		"Content-Type": "application/json",
	});
	if (session?.setCookie) headers.append("Set-Cookie", session.setCookie);
	return new Response(JSON.stringify(body), { headers, status });
}

const unauthorized = (session?: SessionLookup) =>
	json(
		{ code: "unauthorized", message: "Sign in to HackerFeed first." },
		401,
		session,
	);

const forbidden = () =>
	json({ code: "forbidden", message: "Cross-site request" }, 403);

const notFound = () => json(new AiProviderNotFoundError(), 404);

function withResult(
	returnTo: string,
	providerId: string,
	result: "connected" | "error",
	reason?: string,
): string {
	const url = new URL(returnTo, "https://hackerfeed.invalid");
	url.searchParams.set("ai", result);
	url.searchParams.set("provider", providerId);
	if (reason) url.searchParams.set("reason", reason);
	return `${url.pathname}${url.search}${url.hash}`;
}

/** Same-origin check for state-changing requests (SameSite=Lax is the first line). */
function isCrossSiteRequest(request: Request): boolean {
	const site = request.headers.get("Sec-Fetch-Site");
	return site !== null && site !== "same-origin" && site !== "none";
}

function isValidProviderId(providerId: string) {
	return aiProviderIdSchema.safeParse(providerId).success;
}

function errorStatus(error: AiProviderError): number {
	if (error instanceof AiProviderNotFoundError) return 404;
	if (error instanceof AiProviderNotConnectedError) return 409;
	if (error.status === 429) return 429;
	return 502;
}

function logProviderError(
	message: string,
	error: unknown,
	providerId?: string,
) {
	logger.error(message, {
		providerId,
		code: error instanceof AiProviderError ? error.code : undefined,
		err: error instanceof Error ? error.message : String(error),
	});
}

export function createAiHttpHandlers(deps: AiHttpDependencies) {
	const getRedirectUri = (request: Request, providerId: string) =>
		`${deps.getOrigin(request)}${getAiCallbackPath(providerId)}`;

	async function readFlow(
		request: Request,
	): Promise<AiAuthorizationFlow | null> {
		const sealed = getRequestCookie(request, FLOW_COOKIE);
		if (!sealed) return null;
		const plaintext = await deps.cipher.decrypt(decodeURIComponent(sealed));
		if (!plaintext) return null;
		try {
			return JSON.parse(plaintext) as AiAuthorizationFlow;
		} catch {
			return null;
		}
	}

	return {
		/** GET /ai/:provider/connect — starts the provider's sign-in. */
		async connect(request: Request, providerId: string): Promise<Response> {
			if (!isValidProviderId(providerId)) return notFound();
			const url = new URL(request.url);
			const returnTo = normalizeReturnTo(
				url.searchParams.get("returnTo") ?? DEFAULT_RETURN_TO,
			);
			const session = await deps.getSession(request);
			const headers = new Headers();
			if (session.setCookie) headers.append("Set-Cookie", session.setCookie);

			if (!session.user) {
				const signInReturnTo = `${getAiConnectPath(providerId)}?returnTo=${encodeURIComponent(returnTo)}`;
				return redirect(
					`/auth/sign-in?returnTo=${encodeURIComponent(signInReturnTo)}`,
					headers,
				);
			}

			let authorization: Awaited<
				ReturnType<AiProviderService["startAuthorization"]>
			>;
			try {
				authorization = await deps
					.getService()
					.startAuthorization(session.user, providerId, {
						redirectUri: getRedirectUri(request, providerId),
						returnTo,
					});
			} catch (error) {
				logProviderError("AI provider sign-in start failed", error, providerId);
				const reason =
					error instanceof AiProviderError ? error.code : "start_failed";
				return redirect(
					withResult(returnTo, providerId, "error", reason),
					headers,
				);
			}

			const sealedFlow = await deps.cipher.encrypt(
				JSON.stringify(authorization.flow),
			);
			headers.append(
				"Set-Cookie",
				serializeCookie(FLOW_COOKIE, encodeURIComponent(sealedFlow), {
					maxAge: FLOW_MAX_AGE_SECONDS,
					request,
				}),
			);
			return redirect(authorization.url, headers);
		},

		/** GET /ai/:provider/callback — finishes sign-in and stores the connection. */
		async callback(request: Request, providerId: string): Promise<Response> {
			if (!isValidProviderId(providerId)) return notFound();
			const url = new URL(request.url);
			const flow = await readFlow(request);
			const headers = new Headers();
			headers.append("Set-Cookie", clearCookie(FLOW_COOKIE, request));

			const states = url.searchParams.getAll("state");
			if (
				!flow ||
				flow.providerId !== providerId ||
				states.length !== 1 ||
				states[0] !== flow.state
			) {
				return redirect(
					withResult(DEFAULT_RETURN_TO, providerId, "error", "expired"),
					headers,
				);
			}

			const returnTo = normalizeReturnTo(flow.returnTo);
			const providerError = url.searchParams.get("error");
			if (providerError) {
				const reason = /^[a-z_]{1,64}$/.test(providerError)
					? providerError
					: "provider_error";
				return redirect(
					withResult(returnTo, providerId, "error", reason),
					headers,
				);
			}

			const codes = url.searchParams.getAll("code");
			if (codes.length !== 1 || !codes[0]) {
				return redirect(
					withResult(returnTo, providerId, "error", "invalid_callback"),
					headers,
				);
			}

			const session = await deps.getSession(request);
			if (session.setCookie) headers.append("Set-Cookie", session.setCookie);
			if (!session.user) {
				return redirect(
					withResult(returnTo, providerId, "error", "signed_out"),
					headers,
				);
			}

			try {
				await deps
					.getService()
					.completeAuthorization(session.user, flow, url.searchParams);
			} catch (error) {
				logProviderError("AI provider callback failed", error, providerId);
				const reason =
					error instanceof AiProviderError ? error.code : "exchange_failed";
				return redirect(
					withResult(returnTo, providerId, "error", reason),
					headers,
				);
			}

			return redirect(withResult(returnTo, providerId, "connected"), headers);
		},

		/** GET /api/ai/providers — the catalog with the user's connection state. */
		async providers(request: Request): Promise<Response> {
			const session = await deps.getSession(request);
			if (!session.user) return unauthorized(session);
			const providers = await deps
				.getService()
				.listProviders(session.user, (providerId) =>
					getRedirectUri(request, providerId),
				);
			return json({ providers }, 200, session);
		},

		/** GET /api/ai/providers/:provider/models */
		async models(request: Request, providerId: string): Promise<Response> {
			if (!isValidProviderId(providerId)) return notFound();
			const session = await deps.getSession(request);
			if (!session.user) return unauthorized(session);
			try {
				const models = await deps
					.getService()
					.listModels(session.user, providerId);
				return json({ models }, 200, session);
			} catch (error) {
				if (!(error instanceof AiProviderError)) throw error;
				logProviderError("AI model listing failed", error, providerId);
				return json(error, errorStatus(error), session);
			}
		},

		/** POST /api/ai/providers/:provider/disconnect */
		async disconnect(request: Request, providerId: string): Promise<Response> {
			if (isCrossSiteRequest(request)) return forbidden();
			if (!isValidProviderId(providerId)) return notFound();
			const session = await deps.getSession(request);
			if (!session.user) return unauthorized(session);
			try {
				await deps.getService().disconnect(session.user, providerId);
			} catch (error) {
				if (!(error instanceof AiProviderError)) throw error;
				return json(error, errorStatus(error), session);
			}
			return json({ connected: false }, 200, session);
		},

		/** POST /api/ai/chat — streams NDJSON ChatStreamEvents. */
		async chat(request: Request): Promise<Response> {
			if (isCrossSiteRequest(request)) return forbidden();
			if (!request.headers.get("Content-Type")?.includes("application/json")) {
				return json(
					{ code: "unsupported_media_type", message: "Send JSON." },
					415,
				);
			}

			const parsed = storyChatRequestSchema.safeParse(
				await request.json().catch(() => null),
			);
			if (!parsed.success) {
				return json(
					{ code: "invalid_request", message: "That chat request is invalid." },
					400,
				);
			}

			const session = await deps.getSession(request);
			if (!session.user) return unauthorized(session);

			const { messages, model, providerId, storyId } = parsed.data;
			const context = await deps
				.getStoryContext(storyId, request.signal)
				.catch((error: unknown) => {
					logProviderError("Story chat context failed", error, providerId);
					return null;
				});
			if (!context) {
				return json(
					{ code: "story_not_found", message: "That story isn't available." },
					404,
					session,
				);
			}

			let deltas: AsyncGenerator<string>;
			try {
				deltas = await deps.getService().startChat(session.user, providerId, {
					instructions: buildStoryChatInstructions(
						context.story,
						context.comments,
					),
					messages,
					model,
					signal: request.signal,
				});
			} catch (error) {
				if (!(error instanceof AiProviderError)) throw error;
				logProviderError("AI chat start failed", error, providerId);
				return json(error, errorStatus(error), session);
			}

			const encoder = new TextEncoder();
			const body = new ReadableStream<Uint8Array>({
				async start(controller) {
					const send = (event: ChatStreamEvent) =>
						controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
					try {
						for await (const text of deltas) send({ type: "delta", text });
						send({ type: "done" });
					} catch (error) {
						const chatError =
							error instanceof AiProviderError
								? error
								: new AiProviderError(
										"stream_interrupted",
										"The response was interrupted. Try again.",
										{ retryable: true },
									);
						logProviderError("AI chat stream failed", error, providerId);
						send({ type: "error", ...chatError.toJSON() });
					} finally {
						controller.close();
					}
				},
				cancel() {
					void deltas.return(undefined);
				},
			});

			const headers = new Headers({
				"Cache-Control": "no-store",
				"Content-Type": "application/x-ndjson; charset=utf-8",
			});
			if (session.setCookie) headers.append("Set-Cookie", session.setCookie);
			return new Response(body, { headers, status: 200 });
		},
	};
}

export type AiHttpHandlers = ReturnType<typeof createAiHttpHandlers>;
