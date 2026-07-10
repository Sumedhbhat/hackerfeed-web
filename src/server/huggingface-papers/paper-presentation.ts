type PaperPresentationSource = {
	aiSummary: string | null;
	arxivId: string;
	githubRepo: string | null;
	projectPage: string | null;
	summary: string;
};

function toHttpsUrl(value: string | null): string | null {
	if (value === null) return null;

	try {
		const url = new URL(value);
		return url.protocol === "https:" ? url.toString() : null;
	} catch {
		return null;
	}
}

export function projectPaperPresentation(paper: PaperPresentationSource) {
	return {
		abstract:
			paper.aiSummary !== null && paper.aiSummary !== paper.summary
				? paper.summary
				: null,
		githubRepo: toHttpsUrl(paper.githubRepo),
		paperUrl: `https://huggingface.co/papers/${paper.arxivId}`,
		projectPage: toHttpsUrl(paper.projectPage),
		summary: paper.aiSummary ?? paper.summary,
	};
}
