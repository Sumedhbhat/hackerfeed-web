import { globSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { build, normalizePath, transformWithOxc } from "vite";

const testFiles = ["**/*.test.*", "**/*.spec.*", "**/__tests__/**"];
const componentFiles = [
	"apps/web/src/components/**/*.{jsx,tsx}",
	"packages/ui/src/{atoms,molecules}/**/*.{jsx,tsx}",
];

export async function findUnusedUi(repo: string): Promise<string[]> {
	const web = resolve(repo, "apps/web");
	const components = globSync(componentFiles, {
		cwd: repo,
		exclude: testFiles,
	})
		.map((path) => normalizePath(resolve(repo, path)))
		.sort();
	// Include new file-based routes before TanStack regenerates the route tree.
	const routes = globSync("src/routes/**/*.{js,jsx,ts,tsx}", {
		cwd: web,
		exclude: [...testFiles, "**/-*", "**/*.d.ts"],
	});
	const entryPoints = [
		"src/client-entry.tsx",
		"src/server.ts",
		"src/demo-server.ts",
		"src/router.tsx",
		...routes,
	];
	const declared = new Map<string, string[]>();
	const retained = new Map<string, Set<string>>();

	await build({
		root: web,
		configFile: false,
		envFile: false,
		publicDir: false,
		clearScreen: false,
		logLevel: "error",
		resolve: { tsconfigPaths: true },
		plugins: [
			{
				name: "lint-ui",
				enforce: "pre",
				transform(code, id) {
					// Count dev, demo and production paths in the same graph.
					if (
						/\.[jt]sx?$/.test(id) &&
						(code.includes("import.meta.env") || code.includes("process.env"))
					) {
						return transformWithOxc(code, id, {
							tsconfig: false,
							jsx: "preserve",
							define: {
								"import.meta.env": "__lintUiViteEnv",
								"process.env": "__lintUiProcessEnv",
							},
						});
					}
				},
				generateBundle(_options, bundle) {
					for (const id of components) {
						const module = this.getModuleInfo(id);
						if (module) declared.set(id, module.exports);
					}
					for (const chunk of Object.values(bundle)) {
						if (chunk.type !== "chunk") continue;
						for (const [id, module] of Object.entries(chunk.modules)) {
							if (!declared.has(id)) continue;
							const names = retained.get(id) ?? new Set<string>();
							for (const name of module.renderedExports) names.add(name);
							retained.set(id, names);
						}
					}
				},
			},
		],
		build: {
			write: false,
			minify: false,
			reportCompressedSize: false,
			rolldownOptions: {
				input: entryPoints.map((path) => resolve(web, path)),
				preserveEntrySignatures: "strict",
				external: (id) =>
					/\.css(?:\?|$)/.test(id) ||
					(!isAbsolute(id) &&
						!id.startsWith(".") &&
						!id.startsWith("#/") &&
						!id.startsWith("@hackerfeed/")),
				treeshake: {
					// Creating these wrappers has no effect if nobody uses them.
					manualPureFunctions: [
						"createLink",
						"forwardRef",
						"memo",
						"React.forwardRef",
						"React.memo",
					],
				},
			},
		},
	});

	return components.flatMap((id) => {
		const path = normalizePath(relative(repo, id));
		const live = retained.get(id);
		if (!live) return [path];
		return (declared.get(id) ?? [])
			.filter((name) => !live.has(name))
			.sort()
			.map((name) => `${path} (${name})`);
	});
}

if (import.meta.main) {
	const repo = resolve(import.meta.dirname, "../../..");
	const unused = await findUnusedUi(repo);
	if (unused.length) {
		console.error("Unused UI components or exports:");
		for (const path of unused) console.error(`  ${path}`);
		process.exitCode = 1;
	}
}
