const IS_PROD = process.env.NODE_ENV === "production";

export const COOKIE_ACCESS = "ve_access";
export const COOKIE_REFRESH = "ve_refresh";

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
};

// Access token lifetime mirrors the API's JWT exp: 10 minutes.
export function accessCookieOpts(): CookieOptions {
  return { httpOnly: true, secure: IS_PROD, sameSite: "lax", path: "/", maxAge: 600 };
}

// Refresh token: 30 days (capped at session expiry by the API).
export function refreshCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

export function clearCookieOpts(): CookieOptions {
  return { httpOnly: true, secure: IS_PROD, sameSite: "lax", path: "/", maxAge: 0 };
}

/** Base64url-decode the JWT payload. Does NOT verify the signature. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // base64url → base64 (replace URL-safe chars with standard base64)
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * True when the access token's `exp` claim is more than `leeway` seconds
 * from now. No signature verification: the API verifies on every request.
 */
export function isAccessTokenFresh(token: string, leeway = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const exp = payload.exp;
  return typeof exp === "number" && exp - leeway > Date.now() / 1000;
}
