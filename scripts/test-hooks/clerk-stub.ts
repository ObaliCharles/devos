/**
 * Stands in for `@clerk/nextjs/server` when the smoke test runs.
 *
 * There is no browser and no session in a script, and the real module refuses
 * to load outside a request, so `auth()` returns a fixed id instead.
 * Everything downstream — getCurrentUser, requireUser, the user document it
 * creates — is the real code path, which is the point: stubbing requireUser
 * itself would skip the part where a Clerk id becomes a local user.
 *
 * Wired in by `tsconfig.smoke.json`, which the `smoke` script passes to tsx.
 * Nothing in the app ever resolves to this file.
 */
export async function auth() {
  return { userId: process.env.SMOKE_CLERK_ID ?? null };
}

export async function currentUser() {
  if (!process.env.SMOKE_CLERK_ID) return null;
  return {
    firstName: "Smoke",
    username: "smoke",
    emailAddresses: [{ emailAddress: "smoke@test.local" }],
  };
}
