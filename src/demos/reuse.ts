import { DEMO_PASSWORD, DEMO_USERS } from "./reset.js";
import { report, request, stringField } from "./http.js";
import { withDemo } from "./server.js";

const buyer = DEMO_USERS[0];
if (!buyer) throw new Error("missing demo user");

await withDemo(4402, async (base) => {
  const loggedIn = await request(base, "POST", "/auth/login", {
    body: { email: buyer.email, password: DEMO_PASSWORD },
  });
  report("login", loggedIn.status, loggedIn.status === 200);
  const firstRefresh = stringField(loggedIn.json, "refreshToken");

  const rotated = await request(base, "POST", "/auth/refresh", {
    body: { refreshToken: firstRefresh },
  });
  report("r1-refresh", rotated.status, rotated.status === 200);
  const honestRefresh = stringField(rotated.json, "refreshToken");

  const reused = await request(base, "POST", "/auth/refresh", {
    body: { refreshToken: firstRefresh },
  });
  report("r1-reuse", reused.status, reused.status === 401);

  const afterReuse = await request(base, "POST", "/auth/refresh", {
    body: { refreshToken: honestRefresh },
  });
  report("r2-after-reuse", afterReuse.status, afterReuse.status === 401);
});

process.exit(process.exitCode ?? 0);
