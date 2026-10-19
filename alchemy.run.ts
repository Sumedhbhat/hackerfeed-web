import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Docker from "alchemy/Docker";
import * as Output from "alchemy/Output";
import { Stack } from "alchemy/Stack";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type * as Redacted from "effect/Redacted";
import type { DeployTarget } from "./src/platform/types";

const target = (process.env.DEPLOY_TARGET ?? "node") as DeployTarget;

const optionalSecrets = [
	"SENTRY_DSN",
	"VITE_SENTRY_DSN",
	"CHATGPT_CLIENT_ID",
	"CHATGPT_CLIENT_SECRET",
];

const resourceName = (stage: string) =>
	stage === "prod" ? "hackerfeed-web" : `hackerfeed-web-${stage}`;

const runtimeEnv = Effect.fn(function* (stage: string) {
	const environment = stage === "prod" ? "production" : stage;
	const env: Record<string, string | Redacted.Redacted<string>> = {
		VITE_APP_TITLE: "Hacker Feed",
		VITE_WORKOS_API_HOSTNAME: "api.workos.com",
		VITE_WORKOS_REDIRECT_URI: yield* Config.String("VITE_WORKOS_REDIRECT_URI"),
		VITE_WORKOS_CLIENT_ID: yield* Config.Redacted("VITE_WORKOS_CLIENT_ID"),
		AI_TOKEN_ENCRYPTION_KEY: yield* Config.Redacted("AI_TOKEN_ENCRYPTION_KEY"),
		VITE_SENTRY_ENVIRONMENT: environment,
		VITE_SENTRY_TRACES_SAMPLE_RATE: "0.1",
		SENTRY_ENVIRONMENT: environment,
		SENTRY_TRACES_SAMPLE_RATE: "0.1",
		SENTRY_RELEASE: yield* Config.String("SENTRY_RELEASE").pipe(
			Config.withDefault("unknown"),
		),
	};
	for (const name of optionalSecrets) {
		const value = yield* Config.Redacted(name).pipe(Config.option);
		if (Option.isSome(value)) env[name] = value.value;
	}
	return env;
});

const cloudflare = Effect.gen(function* () {
	const { stage } = yield* Stack;
	const name = resourceName(stage);

	const database = yield* Cloudflare.D1.Database("Database", { name });
	const databaseEnv = { D1_DATABASE_ID: database.databaseId };

	const migrate = yield* Command.Exec("Migrate", {
		command: "bun scripts/db.ts migrate",
		env: databaseEnv,
		memo: { include: ["migrations/**", "scripts/db.ts"] },
	});

	if (stage.startsWith("pr-")) {
		yield* Command.Exec("SeedDemoData", {
			command:
				"bun scripts/demo-data-sql.ts > .output/demo-data.sql && bun scripts/db.ts exec .output/demo-data.sql",
			shell: true,
			env: { ...databaseEnv, AFTER_MIGRATIONS: migrate.hash.input },
			memo: { include: ["src/demo-data/**", "migrations/**"] },
		});
	}

	const worker = yield* Cloudflare.Worker("Worker", {
		name,
		main: ".output/server/index.mjs",
		bundle: false,
		assets: ".output/public",
		compatibility: { date: "2025-09-02", flags: ["nodejs_compat"] },
		crons: ["30 23 * * *"],
		observability: {
			enabled: true,
			logs: { enabled: true, invocationLogs: true },
			traces: { enabled: true },
		},
		// Makes the Worker wait for the migrations above.
		tags: [Output.interpolate`migrations-${migrate.hash.input}`],
		env: { DB: database, ...(yield* runtimeEnv(stage)) },
	});

	return { url: worker.url };
});

const node = Effect.gen(function* () {
	const { stage } = yield* Stack;
	const name = resourceName(stage);

	const image = yield* Docker.Image("Image", {
		name,
		tag: stage,
		skipPush: true,
		build: {
			context: ".",
			args: {
				VITE_WORKOS_CLIENT_ID: process.env.VITE_WORKOS_CLIENT_ID ?? "",
				VITE_WORKOS_REDIRECT_URI: process.env.VITE_WORKOS_REDIRECT_URI ?? "",
				VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN ?? "",
				VITE_DEMO_DATA: process.env.VITE_DEMO_DATA ?? "",
			},
		},
	});
	const data = yield* Docker.Volume("Data");
	const port = yield* Config.Port("PORT").pipe(Config.withDefault(3000));

	const container = yield* Docker.Container("App", {
		name,
		image,
		environment: yield* runtimeEnv(stage),
		ports: [{ external: port, internal: 3000 }],
		volumes: [{ hostPath: data.name, containerPath: "/data" }],
		restart: "unless-stopped",
		start: true,
	});

	return { container: container.name, port };
});

export default Alchemy.Stack(
	"hackerfeed-web",
	target === "cloudflare"
		? { providers: Cloudflare.providers(), state: Cloudflare.state() }
		: {
				providers: Docker.providers(),
				state: Alchemy.localState(),
			},
	Effect.gen(function* () {
		return target === "cloudflare" ? yield* cloudflare : yield* node;
	}),
);
