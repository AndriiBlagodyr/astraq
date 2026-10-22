export type DemoResponse = {
  status: number;
  json: Record<string, unknown> | null;
};

export async function request(
  base: string,
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<DemoResponse> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let json: Record<string, unknown> | null = null;
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        json = parsed as Record<string, unknown>;
      }
    } catch {
      json = null;
    }
  }
  return { status: response.status, json };
}

export function report(key: string, status: number, ok: boolean): void {
  console.log(`${key}=${status}`);
  if (!ok) {
    console.error(`invariant failed: ${key}`);
    process.exitCode = 1;
  }
}

export function stringField(json: Record<string, unknown> | null, key: string): string {
  const value = json?.[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`missing ${key}`);
  }
  return value;
}

export function tamperRole(accessToken: string): string {
  const parts = accessToken.split(".");
  const payloadPart = parts[1];
  if (parts.length !== 3 || !payloadPart) throw new Error("not a jwt");
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString()) as Record<
    string,
    unknown
  >;
  payload.role = "admin";
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return parts.join(".");
}
