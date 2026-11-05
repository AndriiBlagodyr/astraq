import type { NextRequest } from "next/server";
import { forwardCredentials } from "@/lib/auth-bff";

export function POST(request: NextRequest) {
  return forwardCredentials(request, "login", {
    rateLimited: "Too many sign-in attempts. Please wait before trying again.",
    failed: "Sign-in failed",
  });
}
