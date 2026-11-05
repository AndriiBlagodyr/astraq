import type { NextRequest } from "next/server";
import { forwardSignOut } from "@/lib/auth-bff";

export function POST(request: NextRequest) {
  return forwardSignOut(request, "logout-all");
}
