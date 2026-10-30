import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryArticle } from "#/components/organisms/story/StoryArticle";

const authMock = vi.hoisted(() => ({
	user: null as { id: string } | null,
}));

const viewStory = vi.hoisted(() => vi.fn());

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({ isLoading: false, user: authMock.user }),
}));

vi.mock("#/hooks/useFeatureFlags", () => ({
	useFeatureFlag: () => true,
}));

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: vi.fn(() => ({
		views: { story: { mutate: viewStory } },
	})),
}));

vi.mock("@tanstack/react-router", async () => ({
	createLink: (await import("#/test/createLinkMock")).createLinkMock,
}));

const story: HackerNewsStoryRecord = {
	by: "author42",
	descendants: 17,
	id: 12345,
	kids: [],
	score: 210,
	text: null,
	time: 1_700_000_000,
	title: "A Test Story Title",
	type: "story",
	url: "https://example.com/test-article",
};

beforeEach(() => {
	authMock.user = null;
	viewStory.mockReset();
	viewStory.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("StoryArticle activity", () => {
	it("records signed-in article and AI chat opens", () => {
		authMock.user = { id: "workos-story-reader" };
		render(<StoryArticle story={story} />);

		fireEvent.click(screen.getByRole("link", { name: /read article/i }));
		fireEvent.click(screen.getByRole("link", { name: /with ai$/i }));

		expect(viewStory.mock.calls).toEqual([
			[{ action: "read", story }],
			[{ action: "chat_opened", story }],
		]);
	});

	it("does not record signed-out opens", () => {
		render(<StoryArticle story={story} />);

		fireEvent.click(screen.getByRole("link", { name: /read article/i }));

		expect(viewStory).not.toHaveBeenCalled();
	});
});
