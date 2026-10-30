import { describe, expect, it } from "vitest";
import { projectPaperPresentation } from "./paper-presentation";

describe("projectPaperPresentation", () => {
	it("projects a distinct AI summary and canonical paper URL", () => {
		expect(
			projectPaperPresentation({
				aiSummary: "AI summary",
				arxivId: "2607.00001",
				githubRepo: "https://github.com/example/repo",
				projectPage: "https://example.com/project",
				summary: "Original abstract",
			}),
		).toEqual({
			abstract: "Original abstract",
			githubRepo: "https://github.com/example/repo",
			paperUrl: "https://huggingface.co/papers/2607.00001",
			projectPage: "https://example.com/project",
			summary: "AI summary",
		});
	});

	it("uses the raw summary directly when there is no distinct AI summary", () => {
		expect(
			projectPaperPresentation({
				aiSummary: null,
				arxivId: "2607.00001",
				githubRepo: null,
				projectPage: null,
				summary: "Original abstract",
			}),
		).toMatchObject({ abstract: null, summary: "Original abstract" });
	});

	it.each([
		["missing", null],
		["malformed", "not a URL"],
		["HTTP", "http://example.com/project"],
		["active content", "javascript:alert(1)"],
	])("maps %s optional URLs to null", (_, value) => {
		expect(
			projectPaperPresentation({
				aiSummary: null,
				arxivId: "2607.00001",
				githubRepo: value,
				projectPage: value,
				summary: "Original abstract",
			}),
		).toMatchObject({ githubRepo: null, projectPage: null });
	});
});
