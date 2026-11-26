import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		tags: [
			{
				name: "integration",
				description:
					"Runs against a local D1 and fakes for WorkOS and Hugging Face (src/tests/support).",
				timeout: 60_000,
			},
		],
	},
});
