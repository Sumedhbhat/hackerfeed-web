// Chooses the projects a change affects, from the Nx project graph. Without
// a usable base commit it selects every project rather than none.
//
//   bun tools/workspace/src/affected.ts --base <sha> [--head <sha>]
//
// In CI it also writes `mode` and `projects` to $GITHUB_OUTPUT and a table
// to $GITHUB_STEP_SUMMARY.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export type Selection = {
	mode: "affected" | "full";
	reason: string;
	projects: string[];
};

const root = join(import.meta.dirname, "../../..");

export function nx(args: string[]): string[] {
	const output = execFileSync(
		"bunx",
		["nx", "show", "projects", ...args, "--json"],
		{
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, NX_DAEMON: "false" },
		},
	);
	return (JSON.parse(output) as string[]).sort();
}

function isCommit(ref: string) {
	try {
		execFileSync("git", ["cat-file", "-e", `${ref}^{commit}`], {
			cwd: root,
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
}

export function selectProjects(
	{
		base,
		head = "HEAD",
		files,
	}: { base?: string; head?: string; files?: string[] },
	run = nx,
): Selection {
	if (files) {
		return {
			mode: "affected",
			reason: `files ${files.join(", ")}`,
			projects: run(["--affected", `--files=${files.join(",")}`]),
		};
	}
	if (!base || !isCommit(base) || !isCommit(head)) {
		return {
			mode: "full",
			reason: `base ${base || "(none)"} is not a commit in this checkout`,
			projects: run([]),
		};
	}
	return {
		mode: "affected",
		reason: `changes from ${base} to ${head}`,
		projects: run(["--affected", `--base=${base}`, `--head=${head}`]),
	};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: { base: { type: "string" }, head: { type: "string" } },
	});
	const selection = selectProjects({ base: values.base, head: values.head });
	console.log(JSON.stringify(selection, null, 2));
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`mode=${selection.mode}\nprojects=${selection.projects.join(",")}\n`,
		);
	}
	if (process.env.GITHUB_STEP_SUMMARY) {
		const rows = selection.projects.map((name) => `| ${name} |`).join("\n");
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			`### Affected projects (${selection.mode})\n\n${selection.reason}\n\n| Project |\n|-|\n${rows || "| (none) |"}\n`,
		);
	}
}
