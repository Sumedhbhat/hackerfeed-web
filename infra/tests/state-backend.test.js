import { Database } from "bun:sqlite";
import { afterAll, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import handler from "../state-backend/src/index.ts";

const sqlite = new Database(":memory:");
sqlite.exec(
	await Bun.file(
		new URL("../state-backend/migrations/0001_states.sql", import.meta.url),
	).text(),
);
const DB = {
	prepare(sql) {
		return {
			bind(...args) {
				const query = sqlite.prepare(sql);
				return {
					async first() {
						return query.get(...args);
					},
					async run() {
						return { meta: { changes: query.run(...args).changes } };
					},
				};
			},
		};
	},
};
const { privateKey, publicKey } = await generateKeyPair("RS256");
const key = {
	...(await exportJWK(publicKey)),
	kid: "local-test",
	alg: "RS256",
};
const audience = "https://hackerfeed-terraform-state.kgqk4vdcfq.workers.dev";
let issuedTokens = 0;
const env = { DB, AUDIENCE: audience, GITHUB_REPOSITORY_ID: "1207731765" };
let loseCommitResponse = false;
const events = [];
const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 0,
	async fetch(request) {
		if (new URL(request.url).pathname === "/jwks")
			return Response.json({ keys: [key] });
		if (new URL(request.url).pathname.endsWith("/idtoken")) {
			expect(new URL(request.url).searchParams.get("audience")).toBe(audience);
			expect(new URL(request.url).searchParams.get("api-version")).toBe("2.0");
			expect(new URL(request.url).searchParams.get("scope")).toBe("build/job");
			expect(request.headers.get("authorization")).toBe(
				"bearer disposable-job-secret",
			);
			issuedTokens++;
			return Response.json({
				value: await token("preview", Math.floor(Date.now() / 1000) + 2),
			});
		}
		// The deployed workers.dev edge rejects urllib's default User-Agent
		// with 403 / error 1010 before the Worker can authenticate the request.
		if (request.headers.get("user-agent")?.startsWith("Python-urllib/")) {
			return new Response("error code: 1010\n", { status: 403 });
		}
		const response = await handler.fetch(request, env);
		if (
			loseCommitResponse &&
			request.method === "POST" &&
			new URL(request.url).pathname.endsWith("/lock") &&
			response.status === 200
		) {
			loseCommitResponse = false;
			events.push(500);
			return new Response("Lost after commit", { status: 500 });
		}
		events.push(response.status);
		return response;
	},
});
const base = `http://127.0.0.1:${server.port}`;
env.JWKS_URL = base + "/jwks";
async function token(
	environment = "preview",
	expiry = "1h",
	repository = env.GITHUB_REPOSITORY_ID,
) {
	return new SignJWT({ repository_id: repository, environment })
		.setProtectedHeader({ alg: "RS256", kid: key.kid })
		.setIssuer("https://token.actions.githubusercontent.com")
		.setAudience(audience)
		.setSubject(`repo:Sumedhbhat/hackerfeed-web:environment:${environment}`)
		.setNotBefore(Math.floor(Date.now() / 1000) - 1)
		.setIssuedAt()
		.setExpirationTime(expiry)
		.sign(privateKey);
}
const preview = await token();
async function request(stage, method, body, jwt = preview, suffix = "/lock") {
	return fetch(`${base}/states/${stage}${suffix}`, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
		headers: { Authorization: "Basic " + btoa("github:" + jwt) },
	});
}
afterAll(() => {
	server.stop(true);
	sqlite.close();
});

test("post-commit retry preserves metadata and excludes 19 concurrent owners", async () => {
	const statuses = await Promise.all(
		Array.from(
			{ length: 20 },
			async (_, i) =>
				(
					await request("pr-42", "POST", {
						ID: `owner-${i}`,
						Info: `original-${i}`,
					})
				).status,
		),
	);
	expect(statuses.filter((status) => status === 200)).toHaveLength(1);
	expect(statuses.filter((status) => status === 423)).toHaveLength(19);
	const held = sqlite
		.query("SELECT lock_id, lock_info FROM states WHERE name = ?")
		.get("pr-42");
	expect(
		(await request("pr-42", "POST", { ID: held.lock_id, Info: "changed" }))
			.status,
	).toBe(200);
	expect(
		sqlite.query("SELECT lock_info FROM states WHERE name = ?").get("pr-42")
			.lock_info,
	).toBe(held.lock_info);
	expect((await request("pr-42", "POST", { ID: "intruder" })).status).toBe(423);
	expect((await request("pr-42", "DELETE", { ID: "intruder" })).status).toBe(
		423,
	);
	expect(
		(await request("pr-42", "POST", { version: 4 }, preview, "?ID=intruder"))
			.status,
	).toBe(423);
	expect(
		(
			await request(
				"pr-42",
				"POST",
				{ version: 4 },
				preview,
				`?ID=${held.lock_id}`,
			)
		).status,
	).toBe(200);
	expect((await request("pr-42", "DELETE", { ID: held.lock_id })).status).toBe(
		200,
	);
	expect((await request("pr-42", "POST", { ID: "next" })).status).toBe(200);
});

test("authentication, expiry, repository and environment restrictions remain enforced", async () => {
	expect((await request("pr-43", "POST", { ID: "x" }, "invalid")).status).toBe(
		401,
	);
	expect(
		(await request("pr-43", "POST", { ID: "x" }, await token("preview", -1)))
			.status,
	).toBe(401);
	expect(
		(
			await request(
				"pr-43",
				"POST",
				{ ID: "x" },
				await token("preview", "1h", "other"),
			)
		).status,
	).toBe(401);
	expect((await request("prod", "POST", { ID: "x" })).status).toBe(403);
	expect(
		(await request("pr-43", "POST", { ID: "x" }, await token("production")))
			.status,
	).toBe(403);
	expect((await request("pr-43", "POST", { ID: 4 })).status).toBe(400);
});

const terraform = Bun.which("terraform");
(terraform ? test : test.skip)(
	"Terraform retries a lost committed lock response and saves/unlocks successfully",
	async () => {
		const directory = await mkdtemp(join(tmpdir(), "hackerfeed-lock-"));
		try {
			await writeFile(
				join(directory, "main.tf"),
				`terraform {
 backend "http" {
  lock_method = "POST"
  unlock_method = "DELETE"
  username = "github"
 }
}
resource "terraform_data" "local" { input = "local-only" }
`,
			);
			const env = {
				...process.env,
				CHECKPOINT_DISABLE: "1",
				TF_HTTP_ADDRESS: base + "/states/pr-44",
				TF_HTTP_LOCK_ADDRESS: base + "/states/pr-44/lock",
				TF_HTTP_UNLOCK_ADDRESS: base + "/states/pr-44/lock",
				TF_HTTP_PASSWORD: preview,
				TF_HTTP_RETRY_WAIT_MIN: "1",
			};
			async function run(args) {
				const child = Bun.spawn([terraform, ...args], {
					cwd: directory,
					env,
					stdout: "pipe",
					stderr: "pipe",
				});
				const [code, stdout, stderr] = await Promise.all([
					child.exited,
					new Response(child.stdout).text(),
					new Response(child.stderr).text(),
				]);
				expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
				return stdout;
			}
			await run(["init", "-input=false", "-no-color"]);
			loseCommitResponse = true;
			const start = events.length;
			await run(["apply", "-auto-approve", "-input=false", "-no-color"]);
			expect(events.slice(start)).toContain(500);
			expect(events.slice(start)).not.toContain(423);
			const state = sqlite
				.query("SELECT lock_id, state FROM states WHERE name = ?")
				.get("pr-44");
			expect(state.lock_id).toBeNull();
			expect(JSON.parse(state.state).resources).toHaveLength(1);
			expect(await Bun.file(join(directory, "errored.tfstate")).exists()).toBe(
				false,
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	},
	30000,
);

(terraform ? test : test.skip)(
	"runner renews real signed JWTs during Terraform apply and the Worker still saves state/unlocks",
	async () => {
		const directory = await mkdtemp(join(tmpdir(), "hackerfeed-proxy-"));
		try {
			const infra = join(directory, "infra");
			await mkdir(join(infra, "terraform"), { recursive: true });
			for (const file of ["state_proxy.py", "recovery_state.py", "commands.py"]) {
				await cp(new URL("../" + file, import.meta.url), join(infra, file));
			}
			await writeFile(
				join(infra, "terraform/main.tf"),
				`terraform {
 backend "http" {
  lock_method = "POST"
  unlock_method = "DELETE"
  username = "github"
 }
}
resource "terraform_data" "local" {
 input = "local-only"
 provisioner "local-exec" { command = "sleep 3" }
}
`,
			);
			// Replace transport only. The Worker's signature/issuer/audience/repo
			// verification and stage permissions are unchanged from deployed f026dee.
			// Exercise the runner's job URL shape, including its existing query.
			await writeFile(
				join(infra, "local.py"),
				`import sys
from urllib.parse import urlsplit
from urllib.request import Request
import state_proxy as runner
original = runner.HTTP
class LocalOnly:
    def open(self, req, **kwargs):
        url = urlsplit(req.full_url)
        if url.hostname == "pipelinesghubeus2.actions.githubusercontent.com":
            target = "${base}" + url.path + "?" + url.query
        elif req.full_url.startswith(runner.STATE_URL + "/states/pr-45"):
            target = "${base}" + url.path + ("?" + url.query if url.query else "")
        else:
            raise ValueError("Unexpected nonlocal test destination")
        return original.open(Request(target, data=req.data, headers=dict(req.headers), method=req.method), **kwargs)
runner.HTTP = LocalOnly()
sys.argv = ["runner", "pr-45", "apply", "-auto-approve", "-input=false", "-no-color"]
sys.exit(runner.main())
`,
			);
			const start = issuedTokens;
			const child = Bun.spawn(["python3", join(infra, "local.py")], {
				env: {
					...process.env,
					GITHUB_ACTIONS: "true",
					RUNNER_TEMP: directory,
					ACTIONS_ID_TOKEN_REQUEST_URL:
						"https://pipelinesghubeus2.actions.githubusercontent.com/tenant/_apis/distributedtask/hubs/build/plans/plan/jobs/job/idtoken?api-version=2.0&scope=build%2Fjob",
					ACTIONS_ID_TOKEN_REQUEST_TOKEN: "disposable-job-secret",
					CHECKPOINT_DISABLE: "1",
				},
				stdout: "pipe",
				stderr: "pipe",
			});
			const [code, stdout, stderr] = await Promise.all([
				child.exited,
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
			]);
			expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
			expect(stdout).not.toContain("disposable-job-secret");
			expect(issuedTokens - start).toBeGreaterThan(1);
			const state = sqlite
				.query("SELECT lock_id, state FROM states WHERE name = ?")
				.get("pr-45");
			expect(state.lock_id).toBeNull();
			expect(JSON.parse(state.state).resources).toHaveLength(1);
			expect(
				await Bun.file(join(infra, "terraform/errored.tfstate")).exists(),
			).toBe(false);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	},
	30000,
);
