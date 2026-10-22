import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// The Phase 1 gate (docs/ui-plan.md § Open questions, resolved): until auth
// lands in Phase 2, a deploy with SITE_PASSWORD set asks for it with HTTP
// Basic auth, so provider data isn't on a public URL (ROADMAP § Data
// licensing). Any username works. Unset (local dev), nothing is gated.
// Phase 2 replaces this file's job with real sessions.
//
// Proxy runs on the Node.js runtime by default (Next.js 16), so node:crypto
// is available. It reads process.env itself instead of importing lib/env:
// Proxy shouldn't rely on shared modules. lib/env still validates the value
// at boot.

const realm = 'Basic realm="Veracand", charset="UTF-8"';

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compares fixed-length digests, so timing says nothing about the password. */
function passwordMatches(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

/** The password half of a `Basic` Authorization header, or null. */
function basicPassword(header: string | null): string | null {
  const encoded = header?.match(/^Basic\s+(\S+)$/i)?.[1];
  if (!encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  return colon === -1 ? null : decoded.slice(colon + 1);
}

export function proxy(request: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.next();

  const given = basicPassword(request.headers.get("authorization"));
  if (given !== null && passwordMatches(given, expected)) {
    return NextResponse.next();
  }
  return new NextResponse("Veracand is private for now.", {
    status: 401,
    headers: { "WWW-Authenticate": realm },
  });
}

export const config = {
  // Everything but build assets, icons, and robots.txt, which carry no data.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt).*)",
  ],
};
