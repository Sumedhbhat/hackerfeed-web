import "@tanstack/react-start/server-only";

export function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/** 256 bits of randomness, base64url encoded (for state, nonce, verifiers). */
export function randomValue(): string {
	return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** RFC 7636 S256 code challenge. */
export async function createCodeChallenge(verifier: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier),
	);
	return toBase64Url(new Uint8Array(digest));
}
