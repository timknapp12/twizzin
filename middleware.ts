import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const supportedLocales = ['en', 'es', 'de'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the pathname starts with a locale
  const pathnameHasLocale = supportedLocales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // If it has a supported locale, let it pass through
    return NextResponse.next();
  }

  // If it doesn't have a locale, check if it's not a special Next.js path
  if (
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    !pathname.includes('.')
  ) {
    // Redirect to the English version
    return NextResponse.redirect(new URL(`/en${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
