/**
 * Every read path in the app, grouped by module. Import from `@/lib/queries`.
 *
 * The rules from ARCHITECTURE.md still hold across all of them:
 *
 * 1. Pages do not query Mongoose directly unless the query is trivial and used
 *    in exactly one place.
 * 2. Every function takes the user id and filters on it. Never rely on the
 *    caller having scoped the read — authorisation belongs next to the query.
 * 3. Watch the query count. `getRoadmap()` builds the whole tree in four
 *    queries no matter how big it gets; keep new tree reads to the same shape
 *    rather than looping and querying per node.
 */

export * from "./learning";
export * from "./knowledge";
export * from "./projects";
export * from "./practice";
export * from "./ai";
export * from "./career";
export * from "./analytics";
export * from "./calendar";
export * from "./admin";
export * from "./platform";
export * from "./search";
