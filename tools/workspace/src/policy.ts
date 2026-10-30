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

/** Which project types each type may import. Infra and tooling import nothing. */
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

/** Which platforms code on each platform may run alongside. */
export const ALLOWED_PLATFORM_DEPENDENCIES: Record<string, readonly string[]> =
	{
		browser: ["browser", "shared"],
		server: ["server", "shared"],
		shared: ["shared"],
		ci: [],
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
