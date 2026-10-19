import { readFileSync } from "node:fs";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Command from "alchemy/Command";
import * as Output from "alchemy/Output";
import { Stack } from "alchemy/Stack";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

type WranglerConfig = {
	main: string;
	compatibility_date: string;
	compatibility_flags: string[];
	vars: Record<string, string>;
	triggers: { crons: string[] };
	observability: {
		enabled: boolean;
		head_sampling_rate: number;
		traces: { enabled: boolean; head_sampling_rate: number };
	};
};

// `bun run build` writes the Worker to dist/server and wrangler.jsonc's
// settings to dist/server/wrangler.json, so wrangler.jsonc stays the one place
// they live.
const wrangler: WranglerConfig = JSON.parse(
	readFileSync("dist/server/wrangler.json", "utf8"),
);

// wrangler.json with DB pointed at this stage's database, for wrangler d1.
const writeD1Config = `jq --arg id "$DB_ID" --arg name "$DB_NAME" '(.d1_databases[] | select(.binding == "DB")) |= (.database_id = $id | .database_name = $name)' dist/server/wrangler.json > "$CONFIG"`;

export default Alchemy.Stack(
	"hackerfeed-web",
	{ providers: Cloudflare.providers(), state: Cloudflare.state() },
	Effect.gen(function* () {
		const { stage } = yield* Stack;
		const prod = stage === "prod";
		const name = prod ? "hackerfeed-web" : `hackerfeed-web-${stage}`;

		// The production database predates Alchemy and is named hackerfeed.
		// Destroying prod forgets it rather than deleting it.
		const database = yield* Cloudflare.D1.Database("Database", {
			name: prod ? "hackerfeed" : name,
		}).pipe(Alchemy.RemovalPolicy.retain(prod));
		const d1Env = {
			DB_ID: database.databaseId,
			DB_NAME: database.databaseName,
			CONFIG: `dist/server/wrangler.${stage}.json`,
		};

		// Wrangler keeps applying migrations/, so `bun run db:migrate:*` and
		// d1_migrations stay as they are.
		const migrate = yield* Command.Exec("Migrate", {
			command: `${writeD1Config} && bunx wrangler d1 migrations apply DB --remote --config "$CONFIG"`,
			shell: true,
			env: d1Env,
			memo: { include: ["migrations/**"] },
		});

		// PR stages replace every row with the dummy data in src/demo-data/database.
		if (stage.startsWith("pr-")) {
			yield* Command.Exec("SeedDemoData", {
				command: `${writeD1Config} && bun scripts/demo-data-sql.ts > dist/demo-data.sql && bunx wrangler d1 execute DB --remote --config "$CONFIG" --file dist/demo-data.sql`,
				shell: true,
				env: { ...d1Env, AFTER_MIGRATIONS: migrate.hash.input },
				memo: { include: ["src/demo-data/**", "migrations/**"] },
			});
		}

		const sentryDsn = yield* Config.Redacted("SENTRY_DSN").pipe(Config.option);
		const { observability } = wrangler;

		const worker = yield* Cloudflare.Worker("Worker", {
			name,
			main: `dist/server/${wrangler.main}`,
			bundle: false,
			assets: "dist/client",
			compatibility: {
				date: wrangler.compatibility_date,
				flags: wrangler.compatibility_flags,
			},
			// Only production runs the scheduled ingestion.
			crons: prod ? wrangler.triggers.crons : [],
			observability: {
				enabled: observability.enabled,
				headSamplingRate: observability.head_sampling_rate,
				logs: { enabled: true, invocationLogs: true },
				traces: {
					enabled: observability.traces.enabled,
					headSamplingRate: observability.traces.head_sampling_rate,
				},
			},
			env: {
				DB: database,
				// Makes the Worker wait for the migrations above.
				MIGRATIONS_HASH: Output.interpolate`${migrate.hash.input}`,
				...wrangler.vars,
				VITE_WORKOS_REDIRECT_URI: yield* Config.String(
					"VITE_WORKOS_REDIRECT_URI",
				).pipe(Config.withDefault(wrangler.vars.VITE_WORKOS_REDIRECT_URI)),
				SENTRY_RELEASE: yield* Config.String("SENTRY_RELEASE").pipe(
					Config.withDefault(""),
				),
				VITE_WORKOS_CLIENT_ID: yield* Config.Redacted("VITE_WORKOS_CLIENT_ID"),
				AI_TOKEN_ENCRYPTION_KEY: yield* Config.Redacted(
					"AI_TOKEN_ENCRYPTION_KEY",
				),
				...(Option.isSome(sentryDsn)
					? { SENTRY_DSN: sentryDsn.value, VITE_SENTRY_DSN: sentryDsn.value }
					: {}),
			},
		});

		return { url: worker.url };
	}),
);
