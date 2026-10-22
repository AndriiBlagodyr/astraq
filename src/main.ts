import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config.js";
import { createPool, migrate } from "./db.js";
import { isDenied, login, logout, refresh, verifyAccess, type AccessClaims } from "./auth.js";

type AuthResult = AccessClaims | { status: 401 };

function send(res: ServerResponse, status: number, body?: unknown): void {
  if (body === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          resolve(parsed as Record<string, unknown>);
          return;
        }
        reject(new Error("invalid json"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function bearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

async function main() {
  const config = await loadConfig();
  const pool = createPool(config);
  await migrate(pool);

  async function authenticate(req: IncomingMessage): Promise<AuthResult> {
    const token = bearer(req);
    if (!token) return { status: 401 };
    const claims = await verifyAccess(config, token);
    if (!claims || (await isDenied(pool, claims.jti))) return { status: 401 };
    return claims;
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const path = url.pathname;
      const method = req.method ?? "GET";

      if (method === "GET" && path === "/health") {
        send(res, 200, { status: "ok" });
        return;
      }

      if (method === "POST" && path === "/auth/login") {
        const body = await readBody(req);
        const email = typeof body.email === "string" ? body.email : "";
        const password = typeof body.password === "string" ? body.password : "";
        const pair = await login(pool, config, email, password);
        if (!pair) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        send(res, 200, pair);
        return;
      }

      if (method === "POST" && path === "/auth/refresh") {
        const body = await readBody(req);
        const raw = typeof body.refreshToken === "string" ? body.refreshToken : "";
        const pair = raw ? await refresh(pool, config, raw) : null;
        if (!pair) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        send(res, 200, pair);
        return;
      }

      if (method === "POST" && path === "/auth/logout") {
        const token = bearer(req);
        const body = await readBody(req);
        const raw = typeof body.refreshToken === "string" ? body.refreshToken : "";
        if (!token || !raw || !(await logout(pool, config, token, raw))) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        send(res, 204);
        return;
      }

      if (method === "GET" && path === "/me") {
        const auth = await authenticate(req);
        if ("status" in auth) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        send(res, 200, { id: auth.sub, role: auth.role });
        return;
      }

      if (method === "POST" && path === "/orders") {
        const auth = await authenticate(req);
        if ("status" in auth) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        const id = randomUUID();
        await pool.query("INSERT INTO orders (id, owner_id) VALUES ($1, $2)", [id, auth.sub]);
        send(res, 201, { id });
        return;
      }

      const orderMatch = method === "GET" ? /^\/orders\/([^/]+)$/.exec(path) : null;
      if (orderMatch) {
        const auth = await authenticate(req);
        if ("status" in auth) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        const orderId = orderMatch[1] ?? "";
        const found = await pool.query<{ id: string; owner_id: string }>(
          "SELECT id, owner_id FROM orders WHERE id = $1",
          [orderId],
        );
        const order = found.rows[0];
        if (!order) {
          send(res, 404, { error: "not_found" });
          return;
        }
        // Ownership is not a guard. The guard only answers "who is this?".
        // The row is already loaded here, so the owner check uses that data.
        if (order.owner_id !== auth.sub) {
          send(res, 403, { error: "forbidden" });
          return;
        }
        send(res, 200, { id: order.id, ownerId: order.owner_id });
        return;
      }

      if (method === "POST" && path === "/products") {
        const auth = await authenticate(req);
        if ("status" in auth) {
          send(res, 401, { error: "unauthorized" });
          return;
        }
        if (auth.role !== "seller" && auth.role !== "admin") {
          send(res, 403, { error: "forbidden" });
          return;
        }
        const body = await readBody(req);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
          send(res, 400, { error: "name is required" });
          return;
        }
        const id = randomUUID();
        await pool.query("INSERT INTO products (id, name, owner_id) VALUES ($1, $2, $3)", [
          id,
          name,
          auth.sub,
        ]);
        send(res, 201, { id });
        return;
      }

      send(res, 404, { error: "not_found" });
    } catch (error) {
      console.error(error instanceof Error ? error.message : "request failed");
      if (!res.headersSent) send(res, 400, { error: "bad_request" });
    }
  });

  server.listen(config.port, "127.0.0.1", () => {
    console.log(
      `listening port=${config.port} kid=${config.kid} key=${config.publicKeyFingerprint}`,
    );
  });

  const shutdown = () => {
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
