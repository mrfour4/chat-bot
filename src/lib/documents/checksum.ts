/**
 * SHA-256 of the uploaded bytes, used to notice a document we already have.
 *
 * Web Crypto rather than `node:crypto`, so the same function works whichever
 * runtime a route ends up on. Node 24 exposes `crypto` globally, so there is
 * nothing to import.
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
