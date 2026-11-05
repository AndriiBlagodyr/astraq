import type { NextRequest } from "next/server";
import { forwardCredentials } from "@/lib/auth-bff";

export function POST(request: NextRequest) {
  return forwardCredentials(
    request,
    "register",
    {
      rateLimited:
        "Too many registration attempts. Please wait before trying again.",
      failed: "Registration failed",
      // 409 is an uninvited email or one already registered. One message
      // for both, so the response doesn't reveal which emails exist.
      conflict: "Registration is currently invite-only.",
    },
    201
  );
}
