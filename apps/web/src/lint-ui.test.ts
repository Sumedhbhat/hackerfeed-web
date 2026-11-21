import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { findUnusedUi } from "../scripts/lint-ui";

it("reports UI unreachable from the app and unused exports in live modules", async () => {
	const repo = mkdtempSync(join(tmpdir(), "hf-unused-ui-"));
	const web = "apps/web/src";
	const ui = "packages/ui/src";
	const files = {
		"apps/web/tsconfig.json": JSON.stringify({
			compilerOptions: { paths: { "#/*": ["./src/*"] } },
		}),
		"packages/ui/package.json": JSON.stringify({
			name: "@hackerfeed/ui",
			exports: {
				"./atoms/Fields": "./src/atoms/Fields.tsx",
				"./atoms/OrphanAtom": "./src/atoms/OrphanAtom.tsx",
			},
		}),
		[`${web}/client-entry.tsx`]: "export {};",
		[`${web}/server.ts`]: "export {};",
		[`${web}/demo-server.ts`]: "export {};",
		[`${web}/router.tsx`]: "export {};",
		[`${web}/routes/new.tsx`]: `
			import { lazy } from "react";
			import { Live } from "@hackerfeed/ui/atoms/Fields";
			const Lazy = lazy(() => import("#/components/Lazy"));
			export const Route = () => import.meta.env.VITE_DEMO_DATA === "true"
				? <Lazy />
				: <Live />;
		`,
		[`${web}/routes/-fixture.tsx`]: `
			export { Orphan } from "#/components/Orphan";
		`,
		[`${web}/components/Lazy.tsx`]: "export default () => <div />;",
		[`${web}/components/Orphan.tsx`]: `
			import { OrphanAtom } from "@hackerfeed/ui/atoms/OrphanAtom";
			export const Orphan = () => <OrphanAtom />;
		`,
		[`${web}/components/Orphan.test.tsx`]: `
			import { Orphan } from "./Orphan";
			export const Fixture = () => <Orphan />;
		`,
		[`${ui}/atoms/Fields.tsx`]: `
			import { memo } from "react";
			import { UnusedChild } from "./UnusedChild";
			export const Live = () => <Local />;
			export const Local = () => <div />;
			const Control = () => <UnusedChild />;
			export const Dead = memo(Control);
		`,
		[`${ui}/atoms/OrphanAtom.tsx`]: "export const OrphanAtom = () => <div />;",
		[`${ui}/atoms/UnusedChild.tsx`]:
			"export const UnusedChild = () => <div />;",
	};

	try {
		for (const [path, source] of Object.entries(files)) {
			const file = join(repo, path);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, source);
		}
		const scope = join(repo, "apps/web/node_modules/@hackerfeed");
		mkdirSync(scope, { recursive: true });
		symlinkSync(join(repo, "packages/ui"), join(scope, "ui"), "junction");

		expect(await findUnusedUi(repo)).toEqual([
			`${web}/components/Orphan.tsx`,
			`${ui}/atoms/Fields.tsx (Dead)`,
			`${ui}/atoms/OrphanAtom.tsx`,
			`${ui}/atoms/UnusedChild.tsx (UnusedChild)`,
		]);
	} finally {
		rmSync(repo, { recursive: true, force: true });
	}
});
