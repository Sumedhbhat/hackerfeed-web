import { describe, expect, it } from "vitest";
import { createDatabaseContext } from "../database/client";
import { insertActivityEvent, readerActivityEvents } from "./events";

const database = createDatabaseContext({} as never);

describe("reader activity events", () => {
	it("are activity_events filtered to one reader", () => {
		const events = readerActivityEvents(database, "user-1");
		const query = database
			.with(events)
			.select({ id: events.id })
			.from(events)
			.toSQL();

		expect(query.sql).toBe(
			'with "reader_activity_events" as (select "id", "appUserId", "action", "storyId", "paperId", "occurredAt", "lastUpdatedDate", "lastUpdatedBy" from "activity_events" where "activity_events"."appUserId" = ?) select "id" from "reader_activity_events"',
		);
		expect(query.params).toEqual(["user-1"]);
	});

	it("are recorded as the reader's own", () => {
		const query = insertActivityEvent(database, "user-1", {
			action: "paper.read",
			paperId: "paper-1",
		}).toSQL();

		expect(query.sql).toContain('"appUserId"');
		expect(query.params).toEqual(["user-1", "paper.read", "paper-1", "user-1"]);
	});
});
