import "@tanstack/react-start/server-only";

type D1Value = ArrayBuffer | boolean | null | number | string;

type D1Result<T> = {
	results?: T[];
	success: boolean;
};

type D1PreparedStatement = {
	all<T = unknown>(): Promise<D1Result<T>>;
	bind(...values: D1Value[]): D1PreparedStatement;
	first<T = unknown>(): Promise<T | null>;
	run(): Promise<D1Result<unknown>>;
};

export type D1DatabaseBinding = {
	prepare(query: string): D1PreparedStatement;
};

const globalForD1 = globalThis as typeof globalThis & {
	hackerfeedD1?: D1DatabaseBinding;
};

export function setD1Database(database: D1DatabaseBinding): void {
	globalForD1.hackerfeedD1 = database;
}

export function getD1Database(): D1DatabaseBinding {
	if (!globalForD1.hackerfeedD1) {
		throw new Error("Cloudflare D1 binding DB is not available");
	}

	return globalForD1.hackerfeedD1;
}
