import "@tanstack/react-start/server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "#/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
	hackerfeedPrisma?: PrismaClient;
};

function createPrismaClient() {
	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL,
	});

	return new PrismaClient({ adapter });
}

export const db = globalForPrisma.hackerfeedPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.hackerfeedPrisma = db;
}

export type DatabaseClient = typeof db;
