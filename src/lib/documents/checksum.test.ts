import { describe, expect, it } from "vitest";

import { sha256Hex } from "@/lib/documents/checksum";

const encode = (text: string) => new TextEncoder().encode(text);

describe("sha256Hex", () => {
  // Published vectors, not snapshots of our own output: these would catch a
  // wrong algorithm or a wrong encoding, which a self-snapshot cannot.
  it("matches the known digest of the empty input", async () => {
    await expect(sha256Hex(new Uint8Array(0))).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it('matches the FIPS 180-2 vector for "abc"', async () => {
    await expect(sha256Hex(encode("abc"))).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("gives different digests to different content", async () => {
    const [a, b] = await Promise.all([
      sha256Hex(encode("tuyển sinh 2026")),
      sha256Hex(encode("tuyển sinh 2027")),
    ]);
    expect(a).not.toBe(b);
  });
});
