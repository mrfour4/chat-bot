import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Opt-in config for tests that call the real Gemini API.
 *
 * Standalone rather than merged with `vitest.config.mts`: `mergeConfig`
 * concatenates `include`, which would drag the whole unit suite into every
 * API run.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    // A single upload polls for up to 60s, then runs a retrieval query.
    testTimeout: 180_000,
    hookTimeout: 60_000,
    // Serial: these share one File Search store, so parallel uploads would make
    // the scoped-retrieval assertions ambiguous.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
