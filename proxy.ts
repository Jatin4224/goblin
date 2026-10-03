import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything is protected unless it is listed here, so a new route is private
// by default rather than private once somebody remembers to add it.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/__clerk(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Redirects before the route renders, so a signed-out visitor is never
    // sent the page's HTML.
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
