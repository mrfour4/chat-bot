import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node, not jsdom: we test pure functions and route logic. The UI is
    // verified by hand (PROJECT_PLAN.md §2), so nothing here needs a DOM.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the single `@/*` alias in tsconfig.json. Kept by hand rather than
    // read out of tsconfig, to avoid taking a dependency for one line.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
