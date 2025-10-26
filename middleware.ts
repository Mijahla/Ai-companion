import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Allow Stripe webhook to be called without authentication
  '/api/webhook(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  // Lightweight logging to help diagnose API vs browser differences
  const path = (req as any).nextUrl?.pathname || (typeof (req as any).url === 'string' ? new URL((req as any).url).pathname : undefined) || '/';
  const publicRoute = isPublicRoute(req);
  console.log(`[middleware] path=${path} isPublic=${publicRoute}`);

  if (!publicRoute) {
    try {
      await auth.protect();
      console.log('[middleware] auth ok for', path);
    } catch (err: any) {
      console.log('[middleware] auth failed for', path, err?.message ?? err);
      throw err;
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}