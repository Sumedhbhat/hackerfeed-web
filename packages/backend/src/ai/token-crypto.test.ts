import { describe, expect, it } from "vitest";
import { createTokenCipher } from "./token-crypto";

const SECRET = "a-very-long-test-secret-that-is-at-least-32-chars";

describe("createTokenCipher", () => {
	it("round-trips plaintext", async () => {
		const cipher = createTokenCipher(SECRET);
		const sealed = await cipher.encrypt("access-token-123");

		expect(sealed.startsWith("v1.")).toBe(true);
		expect(sealed).not.toContain("access-token-123");
		await expect(cipher.decrypt(sealed)).resolves.toBe("access-token-123");
	});

	it("uses a fresh IV so identical plaintexts differ", async () => {
		const cipher = createTokenCipher(SECRET);

		expect(await cipher.encrypt("same")).not.toBe(await cipher.encrypt("same"));
	});

	it("round-trips unicode and long values", async () => {
		const cipher = createTokenCipher(SECRET);
		const value = `${"x".repeat(5_000)} — ✓ ü`;

		await expect(cipher.decrypt(await cipher.encrypt(value))).resolves.toBe(
			value,
		);
	});

	it("rejects ciphertext sealed with another secret", async () => {
		const sealed = await createTokenCipher(SECRET).encrypt("secret");
		const other = createTokenCipher(`${SECRET}-other`);

		await expect(other.decrypt(sealed)).resolves.toBeNull();
	});

	it("rejects tampered ciphertext", async () => {
		const cipher = createTokenCipher(SECRET);
		const sealed = await cipher.encrypt("secret");
		// Flip a character inside the ciphertext (not trailing padding bits).
		const index = sealed.length - 10;
		const swapped = sealed[index] === "A" ? "B" : "A";
		const tampered = `${sealed.slice(0, index)}${swapped}${sealed.slice(index + 1)}`;

		await expect(cipher.decrypt(tampered)).resolves.toBeNull();
	});

	it.each(["", "plaintext", "v1.", "v1.onlyiv", "v2.abc.def", "v1.!!!.???"])(
		"returns null for malformed input %j",
		async (input) => {
			await expect(
				createTokenCipher(SECRET).decrypt(input),
			).resolves.toBeNull();
		},
	);
});
