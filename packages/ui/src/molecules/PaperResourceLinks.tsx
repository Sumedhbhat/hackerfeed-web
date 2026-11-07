import { Code2, Globe } from "lucide-react";
import { ExternalButtonLink } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

/** A paper's optional project page and code links. */
export function PaperResourceLinks({
	title,
	projectPage,
	githubRepo,
}: {
	title: string;
	projectPage: string | null;
	githubRepo: string | null;
}) {
	return (
		<>
			{projectPage ? (
				<ExternalButtonLink
					variant="ghost"
					href={projectPage}
					aria-label={`Project page for ${title}`}
				>
					<Icon icon={Globe} />
					Project
				</ExternalButtonLink>
			) : null}
			{githubRepo ? (
				<ExternalButtonLink
					variant="ghost"
					href={githubRepo}
					aria-label={`Code for ${title}`}
				>
					<Icon icon={Code2} />
					Code
				</ExternalButtonLink>
			) : null}
		</>
	);
}
