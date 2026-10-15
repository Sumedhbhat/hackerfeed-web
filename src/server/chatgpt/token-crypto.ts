import "@tanstack/react-start/server-only";

const KEY_INFO = new TextEncoder().encode("hackerfeed:chatgpt-tokens:v1");
const VERSION_PREFIX = "v1.";

export function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Encrypts secrets (OAuth tokens, PKCE verifiers) with AES-GCM before they are
 * written to D1 or a cookie. The key is derived from a server secret via HKDF.
 */
export function createTokenCipher(secret: string) {
	const keyPromise = crypto.subtle
		.importKey("raw", new TextEncoder().encode(secret), "HKDF", false, [
			"deriveKey",
		])
		.then((material) =>
			crypto.subtle.deriveKey(
				{
					name: "HKDF",
					hash: "SHA-256",
					salt: new Uint8Array(32),
					info: KEY_INFO,
				},
				material,
				{ name: "AES-GCM", length: 256 },
				false,
				["encrypt", "decrypt"],
			),
		);

	return {
		async encrypt(plaintext: string): Promise<string> {
			const iv = crypto.getRandomValues(new Uint8Array(12));
			const ciphertext = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv },
				await keyPromise,
				new TextEncoder().encode(plaintext),
			);
			return `${VERSION_PREFIX}${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
		},

		/** Returns null for anything that was not produced by this cipher. */
		async decrypt(sealed: string): Promise<string | null> {
			if (!sealed.startsWith(VERSION_PREFIX)) return null;
			const [iv, ciphertext] = sealed.slice(VERSION_PREFIX.length).split(".");
			if (!iv || !ciphertext) return null;
			try {
				const plaintext = await crypto.subtle.decrypt(
					{ name: "AES-GCM", iv: fromBase64Url(iv) },
					await keyPromise,
					fromBase64Url(ciphertext),
				);
				return new TextDecoder().decode(plaintext);
			} catch {
				return null;
			}
		},
	};
}

export type TokenCipher = ReturnType<typeof createTokenCipher>;
