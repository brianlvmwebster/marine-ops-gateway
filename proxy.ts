import { clerkMiddleware } from '@clerk/nextjs/server';
// Clerk establishes the session; each page and API independently authorizes it.
export default clerkMiddleware();
export const config={matcher:['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)','/api/(.*)']};
