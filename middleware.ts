import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const supportedLocales = ['en', 'es', 'de'];

function getPreferredLocale(request: NextRequest): string {
  // Get the Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');

  if (acceptLanguage) {
    // Get the first preferred language that's supported
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].substring(0, 2))
      .find((lang) => supportedLocales.includes(lang));

    if (preferredLocale) {
      return preferredLocale;
    }
  }

  return 'en'; // Default to English if no match
}

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
    // Get the preferred locale
    const preferredLocale = getPreferredLocale(request);

    // Redirect to the preferred locale version
    return NextResponse.redirect(
      new URL(`/${preferredLocale}${pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
