#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { Codex } from "@openai/codex-sdk";

const ACCOUNT_PROBE_TIMEOUT_MS = 5_000;
const DISCUSSION_PROMPT_VERSION = "hackerfeed-paper-discussion-v0";
const LOCAL_CODEX_BIN = fileURLToPath(
	new URL("../node_modules/@openai/codex/bin/codex.js", import.meta.url),
);

function parseArgs(argv) {
	const args = {
		abstract: "",
		model: undefined,
		summary: "",
		title: "",
		url: "",
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = argv[index + 1];

		if (arg === "--help" || arg === "-h") {
			args.help = true;
			continue;
		}

		if (arg === "--check-account-only") {
			args.checkAccountOnly = true;
			continue;
		}

		if (
			arg === "--abstract" ||
			arg === "--model" ||
			arg === "--summary" ||
			arg === "--title" ||
			arg === "--url"
		) {
			if (!next) throw new Error(`${arg} requires a value.`);
			args[arg.slice(2)] = next;
			index += 1;
			continue;
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	return args;
}

function printHelp() {
	console.log(`Usage:
  bun run papers:codex-chat -- --title "Paper title" --url "https://huggingface.co/papers/..." [--summary "..."] [--abstract "..."]
  bun run papers:codex-chat -- --check-account-only

Secure defaults:
  - requires local opt-in with HACKERFEED_LOCAL_CODEX_ENABLED=1
  - requires Codex app-server to report a ChatGPT-backed account
  - refuses API-key auth and unsupported account probes
  - does not accept or store shared credentials
`);
}

function requireLocalOwnerOptIn() {
	if (process.env.HACKERFEED_LOCAL_CODEX_ENABLED !== "1") {
		throw new Error(
			"Refusing to start Codex. Set HACKERFEED_LOCAL_CODEX_ENABLED=1 in this local shell to confirm this is an owner-run local workflow.",
		);
	}
}

function sendJson(process, message) {
	process.stdin.write(`${JSON.stringify(message)}\n`);
}

async function readCodexAccount() {
	if (!existsSync(LOCAL_CODEX_BIN)) {
		throw new Error(
			"Missing repo-local Codex binary. Run `bun install` before starting a paper chat.",
		);
	}

	const child = spawn(process.execPath, [LOCAL_CODEX_BIN, "app-server"], {
		stdio: ["pipe", "pipe", "pipe"],
	});
	const rl = readline.createInterface({ input: child.stdout });
	const stderr = readline.createInterface({ input: child.stderr });
	const stderrLines = [];

	stderr.on("line", (line) => {
		stderrLines.push(line);
	});

	return await new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(
				new Error(
					"Timed out while checking Codex account state through app-server.",
				),
			);
		}, ACCOUNT_PROBE_TIMEOUT_MS);

		function cleanup() {
			clearTimeout(timeout);
			rl.close();
			stderr.close();
			child.kill("SIGTERM");
		}

		child.once("error", (error) => {
			cleanup();
			reject(error);
		});

		rl.on("line", (line) => {
			let message;
			try {
				message = JSON.parse(line);
			} catch (error) {
				cleanup();
				reject(new Error(`Codex app-server returned invalid JSON: ${line}`, {
					cause: error,
				}));
				return;
			}

			if (message.id !== 1) return;

			cleanup();

			if (message.error) {
				reject(
					new Error(
						`Codex account probe failed: ${message.error.message}. Upgrade Codex to a version with app-server account endpoints before enabling this workflow.`,
					),
				);
				return;
			}

			resolve(message.result);
		});

		sendJson(child, {
			id: 0,
			method: "initialize",
			params: {
				clientInfo: {
					name: "hackerfeed_paper_chat",
					title: "HackerFeed Paper Chat",
					version: "0.0.0",
				},
			},
		});
		sendJson(child, { method: "initialized", params: {} });
		sendJson(child, {
			id: 1,
			method: "account/read",
			params: { refreshToken: false },
		});
	});
}

async function requireChatGptCodexAccount() {
	const accountState = await readCodexAccount();
	const account = accountState?.account;

	if (!account) {
		throw new Error(
			"No Codex account is signed in. Run `codex login` with your own ChatGPT account, then retry.",
		);
	}

	if (account.type !== "chatgpt") {
		throw new Error(
			`Refusing to run with Codex auth type '${account.type}'. This workflow requires each user to sign in with their own ChatGPT account, not an API key or shared credential.`,
		);
	}

	return {
		planType: account.planType ?? "unknown",
	};
}

function buildPrompt({ abstract, summary, title, url }) {
	const sections = [
		`Prompt version: ${DISCUSSION_PROMPT_VERSION}`,
		"You are helping me do a morning research-paper triage for HackerFeed.",
		"Do not edit files. Treat this as a discussion thread.",
		"",
		"Paper:",
		`Title: ${title}`,
		url ? `URL: ${url}` : null,
		summary ? `Summary: ${summary}` : null,
		abstract ? `Abstract: ${abstract}` : null,
		"",
		"Please help me decide what to do with this paper:",
		"1. Explain the core idea in practical terms.",
		"2. Identify why it may or may not matter for HackerFeed readers.",
		"3. Suggest concrete follow-up questions I should ask in this thread.",
		"4. Suggest one small experiment, note, or product idea if there is a clear fit.",
	].filter(Boolean);

	return sections.join("\n");
}

async function startDiscussion(args) {
	const codex = new Codex();
	const thread = codex.startThread({
		approvalPolicy: "never",
		model: args.model,
		sandboxMode: "read-only",
		workingDirectory: process.cwd(),
	});

	const result = await thread.run(buildPrompt(args));

	return {
		finalResponse: result.finalResponse,
		threadId: thread.id,
		usage: result.usage,
	};
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		printHelp();
		return;
	}

	requireLocalOwnerOptIn();

	const account = await requireChatGptCodexAccount();
	console.error(
		`Using a ChatGPT-backed Codex account (${account.planType}).`,
	);

	if (args.checkAccountOnly) {
		console.log(
			JSON.stringify(
				{ auth: "chatgpt", ok: true, planType: account.planType },
				null,
				2,
			),
		);
		return;
	}

	if (!args.title) throw new Error("--title is required.");

	const result = await startDiscussion(args);

	console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
