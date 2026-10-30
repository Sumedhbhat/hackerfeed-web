/** How the app authenticates API calls; the WorkOS session lives in the app. */
export type ApiAuth = {
	getHeaders(): Promise<Record<string, string>>;
	signIn(returnTo: string): Promise<void> | void;
};
