import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isApi = createRouteMatcher(["/api(.*)"]);

/**
 * Auth gate for everything that is not the landing page or an auth screen.
 *
 * The two arms matter. A signed-out person opening /dashboard should land on
 * the sign-in page with a way back to where they were going — `auth.protect()`
 * on its own answers 404 when it cannot tell a document request from a data
 * request, which is how a missing session ends up looking like a missing page.
 * A signed-out request to /api should get a 401, because redirecting an XHR to
 * an HTML login form only turns an auth error into a JSON parse error.
 */
export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;

  if (isApi(req)) {
    // Explicitly 401 rather than `auth.protect()`, which answers 404 — a
    // status that tells a fetch caller the endpoint is gone when the real
    // problem is that the session is.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    return;
  }

  const signIn = new URL("/sign-in", req.url);
  // Preserve the destination so sign-in can send them back to it.
  signIn.searchParams.set("redirect_url", req.nextUrl.pathname + req.nextUrl.search);
  await auth.protect({ unauthenticatedUrl: signIn.toString() });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
