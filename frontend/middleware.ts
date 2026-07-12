import { clerkMiddleware } from "@clerk/nextjs/server";

// All routes are public by default. To gate the whole app behind sign-in,
// switch to `createRouteMatcher` + `auth.protect()` — see the note in
// docs/architecture.md / the Clerk section of the README.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
