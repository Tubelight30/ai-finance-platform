// import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// Create base Clerk middleware with improved error handling
const clerk = clerkMiddleware(async (auth, req) => {
  try {
    const { userId } = await auth();

    if (!userId && isProtectedRoute(req)) {
      const { redirectToSignIn } = await auth();
      return redirectToSignIn();
    }

    return NextResponse.next();
  } catch (error) {
    // Don't log redirect errors as they are expected
    if (!error.message?.includes("NEXT_REDIRECT")) {
      console.error("Middleware error:", error);
    }
    // In case of auth errors, redirect to sign-in
    if (isProtectedRoute(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    return NextResponse.next();
  }
});

// ArcJet integration commented out per user request — rate limiting disabled for now.
// To re-enable, uncomment the import at the top and the block below, and set ARCJET_KEY.
/*
// Only initialize ArcJet in production with a provided key to avoid noisy dev requests
let aj = null;
if (process.env.ARCJET_KEY && process.env.NODE_ENV === "production") {
  aj = arcjet({
    key: process.env.ARCJET_KEY,
    // characteristics: ["userId"], // Track based on Clerk userId
    rules: [
      // Shield protection for content and security
      shield({
        mode: "LIVE",
      }),
      detectBot({
        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        allow: [
          "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
          "GO_HTTP", // For Inngest
          // See the full list at https://arcjet.com/bot-list
        ],
      }),
    ],
  });
} else {
  if (process.env.NODE_ENV !== "production") {
    console.warn("ArcJet disabled in development to avoid noisy requests. Set ARCJET_KEY and NODE_ENV=production to enable.");
  } else if (!process.env.ARCJET_KEY) {
    console.warn("ARCJET_KEY not set - ArcJet disabled.");
  }
}

// Chain middlewares - ArcJet runs first, then Clerk (only if aj initialized)
let finalMiddleware = clerk;
if (aj) {
  finalMiddleware = createMiddleware(aj, clerk);
}

export default finalMiddleware;
*/

// Export Clerk middleware directly (ArcJet disabled)
export default clerk;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
  // Add timeout configuration
  timeout: 30,
};
