/**
 * Stands in for the `server-only` package under test.
 *
 * `server-only` throws on import by design, to stop server modules being pulled
 * into a client bundle. That guarantee is enforced by the bundler at build
 * time, so replacing it in the test runner costs nothing and lets us exercise
 * server modules directly.
 */
export {};
