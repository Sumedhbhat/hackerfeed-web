import type { hfAuthors } from "@hackerfeed/backend/database/schema";
import { INGESTED_AT, ingestedTimestamps, slugify } from "../defaults";

type Author = typeof hfAuthors.$inferSelect;

export const author = (name: string, fields: Partial<Author> = {}): Author => ({
	id: `demo-author-${slugify(name)}`,
	hfAuthorId: `demo-hf-author-${slugify(name)}`,
	name,
	hidden: false,
	status: null,
	statusLastChangedAt: null,
	hfUserId: null,
	hfUsername: null,
	hfFullname: null,
	avatarUrl: null,
	...ingestedTimestamps,
	...fields,
});

/** An author linked to a Hugging Face account. */
export const hfAccount = (name: string) => ({
	hfUserId: `demo-hf-user-${slugify(name)}`,
	hfUsername: slugify(name),
	hfFullname: name,
});

const verified = {
	status: "claimed_verified",
	statusLastChangedAt: INGESTED_AT,
};

export const ada = author("Ada Placeholder", {
	...hfAccount("Ada Placeholder"),
	...verified,
});
export const ben = author("Ben Example", {
	...hfAccount("Ben Example"),
	...verified,
});
export const chen = author("Chen Sample", hfAccount("Chen Sample"));
export const dana = author("Dana Fixture");
export const eli = author("Eli Mock");
export const fay = author("Fay Dummy");

export const authorRows: Author[] = [ada, ben, chen, dana, eli, fay];
