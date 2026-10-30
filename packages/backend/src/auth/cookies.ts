import "@tanstack/react-start/server-only";

function parseCookieHeader(header: string | null): Map<string, string> {
	const cookies = new Map<string, string>();

	if (!header) {
		return cookies;
	}

	for (const part of header.split(";")) {
		const [rawName, ...rawValue] = part.trim().split("=");
		if (!rawName || rawValue.length === 0) {
			continue;
		}

		cookies.set(rawName, rawValue.join("="));
	}

	return cookies;
}

export function getRequestCookie(
	request: Request,
	name: string,
): string | null {
	return parseCookieHeader(request.headers.get("Cookie")).get(name) ?? null;
}

export function serializeCookie(
	name: string,
	value: string,
	{
		maxAge,
		request,
	}: {
		maxAge: number;
		request: Request;
	},
): string {
	const isSecure = new URL(request.url).protocol === "https:";
	const parts = [
		`${name}=${value}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${maxAge}`,
	];

	if (isSecure) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

export function clearCookie(name: string, request: Request): string {
	return serializeCookie(name, "", { maxAge: 0, request });
}

export function encodeJsonCookie(value: unknown): string {
	return encodeURIComponent(JSON.stringify(value));
}

export function decodeJsonCookie<T>(value: string | null): T | null {
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(decodeURIComponent(value)) as T;
	} catch {
		return null;
	}
}

export function normalizeReturnTo(value: string | null): string {
	if (!value?.startsWith("/") || value.startsWith("//")) {
		return "/";
	}

	return value;
}
