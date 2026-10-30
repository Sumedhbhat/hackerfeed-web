export const TYPES = [
	"app",
	"ui",
	"contracts",
	"domain",
	"runtime",
	"backend",
	"api-client",
	"infra",
	"tooling",
];

export const PLATFORMS = ["browser", "server", "shared", "ci"];

export const SCOPES = ["hackerfeed", "shared"];

/** Which project types each type may import. */
export const ALLOWED_TYPE_DEPENDENCIES: Record<string, readonly string[]> = {
	app: ["ui", "contracts", "domain", "runtime", "backend", "api-client"],
	ui: [],
	contracts: [],
	domain: [],
	runtime: [],
	backend: ["contracts", "domain", "runtime"],
	"api-client": ["contracts", "domain", "runtime", "backend"],
	infra: [],
	tooling: [],
};

/** Which platforms code on each platform may import. */
export const ALLOWED_PLATFORM_DEPENDENCIES: Record<string, readonly string[]> =
	{
		browser: ["browser", "shared"],
		server: ["server", "shared"],
		shared: ["shared"],
		ci: [],
	};

/**
 * npm packages a project type may import outside its tests: `allow` lists
 * the only ones, `forbid` lists ones it may never use.
 */
export const EXTERNAL_IMPORTS: Record<
	string,
	{ allow?: readonly string[]; forbid?: readonly string[] }
> = {
	contracts: { allow: ["zod"] },
	domain: { allow: [] },
	runtime: { allow: ["@sentry/core", "ky"] },
	ui: {
		allow: [
			"@base-ui/react",
			"@tanstack/react-router",
			"lucide-react",
			"react",
			"react-dom",
		],
	},
	"api-client": {
		allow: ["@sentry/core", "@trpc/client", "superjson", "zod"],
	},
	backend: {
		forbid: [
			"@base-ui/react",
			"@tanstack/react-query",
			"@tanstack/react-router",
			"@workos-inc/authkit-react",
			"lucide-react",
			"react",
			"react-dom",
		],
	},
};

/**
 * Edges that break the rules above on purpose. Each one names the only
 * specifiers it may use, and whether those imports must be type-only.
 */
export const EXCEPTIONS = [
	{
		from: "api-client",
		to: "backend",
		specifiers: ["@hackerfeed/backend/api-types"],
		typeOnly: true,
		reason:
			"tRPC infers the browser client from the server router's type. Type-only imports are erased, so no backend code reaches the browser.",
	},
];

/** Tracked files outside every project. Anything else must be in one. */
export const WORKSPACE_FILES = [
	/^[^/]+$/,
	/^\.claude\//,
	/^\.github\//,
	/^\.vscode\//,
	/^docs\//,
	/^lint\//,
	/^scripts\//,
];

/** Generated files the import checks skip. */
export const GENERATED_FILES = [
	/(^|\/)routeTree\.gen\.ts$/,
	/(^|\/)worker-configuration\.d\.ts$/,
];
