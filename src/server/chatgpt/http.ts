import "@tanstack/react-start/server-only";

import {
	type ChatStreamEvent,
	storyChatRequestSchema,
} from "#/lib/chatgpt/schemas";
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
import { ChatGptError, ChatGptNotConnectedError } from "./errors";
import type { ChatGptAuthorizationFlow, ChatGptService } from "./service";
import { buildStoryChatInstructions } from "./story-context";
import type { TokenCipher } from "./token-crypto";

export const CHATGPT_CONNECT_PATH = "/chatgpt/connect";
export const CHATGPT_CALLBACK_PATH = "/chatgpt/callback";
const FLOW_COOKIE = "hackerfeed_chatgpt_flow";
const FLOW_MAX_AGE_SECONDS = 60 * 10;
const DEFAULT_RETURN_TO = "/profile";

type SessionLookup = {
	user: AuthenticatedWorkosUser | null;
	setCookie?: string;
};

export type StoryChatContext = {
	story: HackerNewsStoryRecord;
	comments: HackerNewsCommentRecord[];
};

export type ChatGptHttpDependencies = {
	cipher: TokenCipher;
	getOrigin(request: Request): string;
	getService(): ChatGptService;
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

function withChatGptResult(
	returnTo: string,
	result: "connected" | "error",
	reason?: string,
): string {
	const url = new URL(returnTo, "https://hackerfeed.invalid");
	url.searchParams.set("chatgpt", result);
	if (reason) url.searchParams.set("reason", reason);
	return `${url.pathname}${url.search}${url.hash}`;
}

/** Same-origin check for state-changing requests (SameSite=Lax is the first line). */
function isCrossSiteRequest(request: Request): boolean {
	const site = request.headers.get("Sec-Fetch-Site");
	return site !== null && site !== "same-origin" && site !== "none";
}

function errorStatus(error: ChatGptError): number {
	if (error instanceof ChatGptNotConnectedError) return 409;
	if (error.status === 429) return 429;
	return 502;
}

function logChatGptError(message: string, error: unknown) {
	logger.error(message, {
		code: error instanceof ChatGptError ? error.code : undefined,
		err: error instanceof Error ? error.message : String(error),
	});
}

export function createChatGptHttpHandlers(deps: ChatGptHttpDependencies) {
	const getRedirectUri = (request: Request) =>
		`${deps.getOrigin(request)}${CHATGPT_CALLBACK_PATH}`;

	async function readFlow(
		request: Request,
	): Promise<ChatGptAuthorizationFlow | null> {
		const sealed = getRequestCookie(request, FLOW_COOKIE);
		if (!sealed) return null;
		const plaintext = await deps.cipher.decrypt(decodeURIComponent(sealed));
		if (!plaintext) return null;
		try {
			return JSON.parse(plaintext) as ChatGptAuthorizationFlow;
		} catch {
			return null;
		}
	}

	return {
		async connect(request: Request): Promise<Response> {
			const url = new URL(request.url);
			const returnTo = normalizeReturnTo(
				url.searchParams.get("returnTo") ?? DEFAULT_RETURN_TO,
			);
			const session = await deps.getSession(request);
			const headers = new Headers();
			if (session.setCookie) headers.append("Set-Cookie", session.setCookie);

			if (!session.user) {
				const signInReturnTo = `${CHATGPT_CONNECT_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
				return redirect(
					`/auth/sign-in?returnTo=${encodeURIComponent(signInReturnTo)}`,
					headers,
				);
			}

			let authorization: Awaited<
				ReturnType<ChatGptService["startAuthorization"]>
			>;
			try {
				authorization = await deps
					.getService()
					.startAuthorization(session.user, {
						redirectUri: getRedirectUri(request),
						returnTo,
					});
			} catch (error) {
				logChatGptError("ChatGPT authorization start failed", error);
				const reason =
					error instanceof ChatGptError ? error.code : "start_failed";
				return redirect(withChatGptResult(returnTo, "error", reason), headers);
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

		async callback(request: Request): Promise<Response> {
			const url = new URL(request.url);
			const flow = await readFlow(request);
			const headers = new Headers();
			headers.append("Set-Cookie", clearCookie(FLOW_COOKIE, request));

			const states = url.searchParams.getAll("state");
			if (!flow || states.length !== 1 || states[0] !== flow.state) {
				return redirect(
					withChatGptResult(DEFAULT_RETURN_TO, "error", "expired"),
					headers,
				);
			}

			const returnTo = normalizeReturnTo(flow.returnTo);
			const providerError = url.searchParams.get("error");
			if (providerError) {
				const reason = /^[a-z_]{1,64}$/.test(providerError)
					? providerError
					: "provider_error";
				return redirect(withChatGptResult(returnTo, "error", reason), headers);
			}

			const codes = url.searchParams.getAll("code");
			const clientIds = url.searchParams.getAll("client_id");
			if (codes.length !== 1 || !codes[0] || clientIds.length > 1) {
				return redirect(
					withChatGptResult(returnTo, "error", "invalid_callback"),
					headers,
				);
			}

			const session = await deps.getSession(request);
			if (session.setCookie) headers.append("Set-Cookie", session.setCookie);
			if (!session.user) {
				return redirect(
					withChatGptResult(returnTo, "error", "signed_out"),
					headers,
				);
			}

			try {
				await deps.getService().completeAuthorization(session.user, flow, {
					code: codes[0],
					clientId: clientIds[0] ?? null,
				});
			} catch (error) {
				logChatGptError("ChatGPT authorization callback failed", error);
				const reason =
					error instanceof ChatGptError ? error.code : "exchange_failed";
				return redirect(withChatGptResult(returnTo, "error", reason), headers);
			}

			return redirect(withChatGptResult(returnTo, "connected"), headers);
		},

		async status(request: Request): Promise<Response> {
			const session = await deps.getSession(request);
			if (!session.user) {
				return json(
					{ code: "unauthorized", message: "Sign in to HackerFeed first." },
					401,
					session,
				);
			}
			const status = await deps
				.getService()
				.getStatus(session.user, getRedirectUri(request));
			return json(status, 200, session);
		},

		async models(request: Request): Promise<Response> {
			const session = await deps.getSession(request);
			if (!session.user) {
				return json(
					{ code: "unauthorized", message: "Sign in to HackerFeed first." },
					401,
					session,
				);
			}
			try {
				const models = await deps.getService().listModels(session.user);
				return json({ models }, 200, session);
			} catch (error) {
				if (!(error instanceof ChatGptError)) throw error;
				logChatGptError("ChatGPT model listing failed", error);
				return json(error, errorStatus(error), session);
			}
		},

		async disconnect(request: Request): Promise<Response> {
			if (isCrossSiteRequest(request)) {
				return json({ code: "forbidden", message: "Cross-site request" }, 403);
			}
			const session = await deps.getSession(request);
			if (!session.user) {
				return json(
					{ code: "unauthorized", message: "Sign in to HackerFeed first." },
					401,
					session,
				);
			}
			await deps.getService().disconnect(session.user);
			return json({ connected: false }, 200, session);
		},

		async chat(request: Request): Promise<Response> {
			if (isCrossSiteRequest(request)) {
				return json({ code: "forbidden", message: "Cross-site request" }, 403);
			}
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
			if (!session.user) {
				return json(
					{ code: "unauthorized", message: "Sign in to HackerFeed first." },
					401,
					session,
				);
			}

			const { messages, model, storyId } = parsed.data;
			const context = await deps
				.getStoryContext(storyId, request.signal)
				.catch((error: unknown) => {
					logChatGptError("Story chat context failed", error);
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
				deltas = await deps.getService().startChat(session.user, {
					instructions: buildStoryChatInstructions(
						context.story,
						context.comments,
					),
					messages,
					model,
					signal: request.signal,
				});
			} catch (error) {
				if (!(error instanceof ChatGptError)) throw error;
				logChatGptError("ChatGPT chat start failed", error);
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
							error instanceof ChatGptError
								? error
								: new ChatGptError(
										"stream_interrupted",
										"The response was interrupted. Try again.",
										{ retryable: true },
									);
						logChatGptError("ChatGPT chat stream failed", error);
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

export type ChatGptHttpHandlers = ReturnType<typeof createChatGptHttpHandlers>;
