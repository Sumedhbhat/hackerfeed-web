// Checks the workspace's structure against tools/workspace/src/policy.ts:
// project metadata, file ownership, import boundaries, declared dependencies,
// public entry points and cycles. Reads projects from the Nx graph.
//
//   bun run check:workspace
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { builtinModules } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
	ALLOWED_PLATFORM_DEPENDENCIES,
	ALLOWED_TYPE_DEPENDENCIES,
	EXCEPTIONS,
	EXTERNAL_IMPORTS,
	GENERATED_FILES,
	PLATFORMS,
	SCOPES,
	TYPES,
	WORKSPACE_FILES,
} from "./policy";

export type PackageJson = {
	name?: string;
	exports?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
};

export type Project = {
	name: string;
	root: string;
	tags: string[];
	owner?: string;
	implicitDependencies: string[];
	packageJson?: PackageJson;
};

export type Workspace = {
	projects: Project[];
	rootPackageJson: PackageJson;
	/** Every tracked path, and the text of each source file among them. */
	files: string[];
	read(path: string): string;
};

export type ImportStatement = {
	specifier: string;
	typeOnly: boolean;
	line: number;
};

const SOURCE = /\.(ts|tsx|js|mjs)$/;
const TEST = /\.test\.(ts|tsx|js|mjs)$/;
const BUILTINS = new Set(builtinModules);

function blank(text: string) {
	return text.replace(/[^\n]/g, " ");
}

/** Import specifiers in a module, ignoring comments and template literals. */
export function findImports(source: string): ImportStatement[] {
	const code = source
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/`(?:\\[\s\S]|[^`\\])*`/g, blank)
		.replace(/(^|[^:"'\\])\/\/[^\n]*/g, (match, prefix) =>
			prefix.concat(blank(match.slice(prefix.length))),
		);
	const found: ImportStatement[] = [];
	const lineOf = (index: number) => code.slice(0, index).split("\n").length;
	const statement =
		/(?:^|[\n;])\s*(import|export)\s+(type\s+)?([^;'"]*?)\s*from\s*["']([^"']+)["']/g;
	for (const match of code.matchAll(statement)) {
		const [, , typeKeyword, clause, specifier] = match;
		const names = /\{([^}]*)\}/.exec(clause)?.[1].split(",") ?? [];
		const inlineTypes =
			names.length > 0 &&
			!/^\s*[\w$]+\s*,?\s*\{/.test(clause) &&
			!clause.includes("*") &&
			names.every((name) => !name.trim() || /^\s*type\s/.test(name));
		found.push({
			specifier,
			typeOnly: Boolean(typeKeyword) || inlineTypes,
			line: lineOf(match.index ?? 0),
		});
	}
	const bare =
		/(?:^|[\n;])\s*import\s*["']([^"']+)["']|(?:\bimport|\bvi\.(?:mock|doMock|importActual))\s*(?:<[^>]*>)?\(\s*["']([^"']+)["']/g;
	for (const match of code.matchAll(bare)) {
		found.push({
			specifier: match[1] ?? match[2],
			typeOnly: false,
			line: lineOf(match.index ?? 0),
		});
	}
	return found;
}

function packageName(specifier: string) {
	const parts = specifier.split("/");
	return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function tagValues(project: Project, dimension: string) {
	return project.tags
		.filter((tag) => tag.startsWith(`${dimension}:`))
		.map((tag) => tag.slice(dimension.length + 1));
}

function declared(packageJson: PackageJson | undefined) {
	return new Set(
		Object.keys({
			...packageJson?.dependencies,
			...packageJson?.devDependencies,
			...packageJson?.peerDependencies,
		}),
	);
}

function exportKey(specifier: string, name: string) {
	const subpath = specifier.slice(name.length).replace(/\?.*$/, "");
	return subpath ? `.${subpath}` : ".";
}

function findCycles(projects: Project[], edges: Map<string, Set<string>>) {
	const cycles: string[][] = [];
	const state = new Map<string, "visiting" | "done">();
	const stack: string[] = [];
	const visit = (name: string) => {
		state.set(name, "visiting");
		stack.push(name);
		for (const next of edges.get(name) ?? []) {
			if (state.get(next) === "visiting") {
				cycles.push([...stack.slice(stack.indexOf(next)), next]);
			} else if (!state.has(next)) {
				visit(next);
			}
		}
		stack.pop();
		state.set(name, "done");
	};
	for (const project of projects)
		if (!state.has(project.name)) visit(project.name);
	return cycles;
}

export function checkWorkspace(workspace: Workspace): string[] {
	const errors: string[] = [];
	const { projects } = workspace;
	const byName = new Map(projects.map((project) => [project.name, project]));
	const byPackage = new Map(
		projects
			.filter((project) => project.packageJson?.name)
			.map((project) => [project.packageJson?.name as string, project]),
	);
	const sortedRoots = [...projects].sort(
		(a, b) => b.root.length - a.root.length,
	);
	const projectOf = (path: string) =>
		sortedRoots.find(
			(project) => path === project.root || path.startsWith(`${project.root}/`),
		);

	for (const project of projects) {
		const label = `${project.name} (${project.root})`;
		const types = tagValues(project, "type");
		const platforms = tagValues(project, "platform");
		const scopes = tagValues(project, "scope");
		if (types.length !== 1 || !TYPES.includes(types[0])) {
			errors.push(
				`${label}: needs exactly one type:* tag from ${TYPES.join(", ")}`,
			);
		}
		if (
			platforms.length === 0 ||
			platforms.some((p) => !PLATFORMS.includes(p))
		) {
			errors.push(
				`${label}: needs platform:* tags from ${PLATFORMS.join(", ")}`,
			);
		}
		if (scopes.length !== 1 || !SCOPES.includes(scopes[0])) {
			errors.push(
				`${label}: needs exactly one scope:* tag from ${SCOPES.join(", ")}`,
			);
		}
		if (!project.owner || !/^@[\w-]+(\/[\w-]+)?$/.test(project.owner)) {
			errors.push(`${label}: needs metadata.owner, a GitHub login or team`);
		}
		for (const other of projects) {
			if (other !== project && other.root.startsWith(`${project.root}/`)) {
				errors.push(
					`${label}: contains another project, ${other.name} (${other.root})`,
				);
			}
		}
		for (const dependency of project.implicitDependencies) {
			if (!byName.has(dependency.replace(/^!/, ""))) {
				errors.push(
					`${label}: implicit dependency ${dependency} is not a project`,
				);
			}
		}
		for (const [key, target] of Object.entries(
			project.packageJson?.exports ?? {},
		)) {
			const path = normalize(join(project.root, target));
			if (!workspace.files.includes(path)) {
				errors.push(`${label}: export "${key}" points at missing ${path}`);
			}
		}
	}

	const edges = new Map<string, Set<string>>(
		projects.map((project) => [
			project.name,
			new Set(project.implicitDependencies.filter((d) => !d.startsWith("!"))),
		]),
	);

	for (const path of workspace.files) {
		const project = projectOf(path);
		if (!project) {
			if (!WORKSPACE_FILES.some((pattern) => pattern.test(path))) {
				errors.push(
					`${path}: belongs to no project; add it to one, or a project.json for it`,
				);
			}
			continue;
		}
		if (path.endsWith(".tf")) {
			const modules = workspace
				.read(path)
				.matchAll(/\bsource\s*=\s*"(\.{1,2}\/[^"]+)"/g);
			for (const [, source] of modules) {
				const target = projectOf(normalize(join(dirname(path), source)));
				if (!target) {
					errors.push(`${path}: module source "${source}" is in no project`);
				} else if (
					target !== project &&
					!project.implicitDependencies.includes(target.name)
				) {
					errors.push(
						`${path}: uses module ${target.name}; add it to ${project.name}'s implicitDependencies`,
					);
				}
			}
			continue;
		}
		if (!SOURCE.test(path) || GENERATED_FILES.some((p) => p.test(path)))
			continue;

		const isDevelopmentOnly =
			TEST.test(path) || !path.startsWith(`${project.root}/src/`);
		const [type] = tagValues(project, "type");
		const platforms = tagValues(project, "platform");
		const ownDependencies = project.packageJson
			? declared(project.packageJson)
			: declared(workspace.rootPackageJson);

		for (const { specifier, typeOnly, line } of findImports(
			workspace.read(path),
		)) {
			const where = `${path}:${line}`;
			if (specifier.startsWith(".")) {
				const target = normalize(join(dirname(path), specifier));
				if (projectOf(target) !== project) {
					errors.push(
						`${where}: relative import "${specifier}" leaves ${project.name}; import the package instead`,
					);
				}
				continue;
			}
			if (specifier.startsWith("#/")) {
				if (!project.packageJson) {
					errors.push(
						`${where}: "${specifier}" needs a package.json "imports" map`,
					);
				}
				continue;
			}
			if (
				/^(node|bun|cloudflare):/.test(specifier) ||
				BUILTINS.has(specifier)
			) {
				continue;
			}

			const name = packageName(specifier);
			if (!ownDependencies.has(name) && name !== project.packageJson?.name) {
				errors.push(
					`${where}: imports ${name}, which ${project.packageJson ? `${project.root}/package.json` : "the root package.json"} does not declare`,
				);
			}

			const target = byPackage.get(name);
			if (!target) {
				const rule = EXTERNAL_IMPORTS[type];
				if (!isDevelopmentOnly && rule) {
					const allowed = rule.allow ? rule.allow.includes(name) : true;
					if (!allowed || rule.forbid?.includes(name)) {
						errors.push(`${where}: ${type} projects may not import ${name}`);
					}
				}
				continue;
			}
			if (target === project) continue;
			edges.get(project.name)?.add(target.name);

			const key = exportKey(specifier, name);
			if (
				!target.packageJson?.exports ||
				!(key in target.packageJson.exports)
			) {
				errors.push(
					`${where}: "${specifier}" is not a public export of ${name}`,
				);
			}

			const [targetType] = tagValues(target, "type");
			const targetPlatforms = tagValues(target, "platform");
			const exception = EXCEPTIONS.find(
				(e) => e.from === project.name && e.to === target.name,
			);
			if (exception) {
				if (!exception.specifiers.includes(specifier)) {
					errors.push(
						`${where}: ${project.name} may import ${target.name} only through ${exception.specifiers.join(", ")}`,
					);
				} else if (exception.typeOnly && !typeOnly) {
					errors.push(
						`${where}: ${project.name} may import ${specifier} only with "import type"`,
					);
				}
				continue;
			}
			if (!ALLOWED_TYPE_DEPENDENCIES[type]?.includes(targetType)) {
				errors.push(
					`${where}: ${type} project ${project.name} may not import ${targetType} project ${target.name}`,
				);
			}
			const reachable = new Set(
				platforms.flatMap((p) => ALLOWED_PLATFORM_DEPENDENCIES[p] ?? []),
			);
			if (!targetPlatforms.every((p) => reachable.has(p))) {
				errors.push(
					`${where}: ${platforms.join("+")} code in ${project.name} may not import ${targetPlatforms.join("+")} project ${target.name}`,
				);
			}
		}
	}

	for (const cycle of findCycles(projects, edges)) {
		errors.push(`dependency cycle: ${cycle.join(" -> ")}`);
	}
	return errors;
}

type NxGraph = {
	graph: {
		nodes: Record<
			string,
			{
				data: {
					root: string;
					tags?: string[];
					metadata?: { owner?: string };
					implicitDependencies?: string[];
				};
			}
		>;
	};
};

export function loadWorkspace(root: string): Workspace {
	const scratch = mkdtempSync(join(tmpdir(), "hf-graph-"));
	try {
		const file = join(scratch, "graph.json");
		execFileSync("bunx", ["nx", "graph", `--file=${file}`], {
			cwd: root,
			env: { ...process.env, NX_DAEMON: "false" },
			stdio: "ignore",
		});
		const graph = JSON.parse(readFileSync(file, "utf8")) as NxGraph;
		const readJson = (path: string) =>
			JSON.parse(readFileSync(join(root, path), "utf8")) as PackageJson;
		const projects = Object.entries(graph.graph.nodes).map(
			([name, { data }]) => ({
				name,
				root: data.root,
				tags: data.tags ?? [],
				owner: data.metadata?.owner,
				implicitDependencies: data.implicitDependencies ?? [],
				packageJson: existsSync(join(root, data.root, "package.json"))
					? readJson(join(data.root, "package.json"))
					: undefined,
			}),
		);
		const files = execFileSync(
			"git",
			["ls-files", "--cached", "--others", "--exclude-standard"],
			{ cwd: root, encoding: "utf8" },
		)
			.split("\n")
			.filter((path) => path && existsSync(join(root, path)));
		return {
			projects,
			rootPackageJson: readJson("package.json"),
			files,
			read: (path) => readFileSync(join(root, path), "utf8"),
		};
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const root = join(import.meta.dirname, "../../..");
	const workspace = loadWorkspace(root);
	const errors = checkWorkspace(workspace);
	if (errors.length > 0) {
		console.error(
			`Workspace check failed:\n${errors.map((e) => `  ${e}`).join("\n")}`,
		);
		process.exit(1);
	}
	console.log(
		`Workspace OK: ${workspace.projects.length} projects, ${workspace.files.length} files (${relative(process.cwd(), root) || "."})`,
	);
}
