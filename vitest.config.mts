import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node, not jsdom: we test pure functions and route logic. The UI is
    // verified by hand (PROJECT_PLAN.md §2), so nothing here needs a DOM.
    environment: "node",
    // `.itest.ts` files call the real Gemini API and are excluded here; run
    // them deliberately with `npm run test:api`.
    // `.tsx` included so the Markdown renderer can be asserted through
    // `renderToStaticMarkup`, which needs no DOM.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    // Mirrors the single `@/*` alias in tsconfig.json. Kept by hand rather than
    // read out of tsconfig, to avoid taking a dependency for one line.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws on import by design; the bundler enforces that
      // guarantee at build time, so stubbing it here lets tests exercise
      // server modules without weakening anything in the app.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
