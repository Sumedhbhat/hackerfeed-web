import { defineTask } from "nitro/task";
import { getPlatform } from "#/platform";
import { runHuggingFaceDailyPapersIngestion } from "./ingestion";

/** Nightly paper ingestion, scheduled by `scheduledTasks` in vite.config.ts. */
export default defineTask({
	meta: {
		name: "papers:ingest",
		description: "Store the latest Hugging Face daily papers edition",
	},
	async run() {
		const platform = await getPlatform();
		const result = await platform.traceTask("papers:ingest", async () =>
			runHuggingFaceDailyPapersIngestion(await platform.openDatabase()),
		);
		return { result };
	},
});
