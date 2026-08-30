/**
 * Query keys in one place, so an invalidation and a fetch cannot disagree about
 * how a cache entry is spelled — a mismatch that fails silently, leaving stale
 * data on screen with nothing in the console.
 */
export const queryKeys = {
  documents: ["documents"] as const,
};
