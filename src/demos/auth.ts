import { DEMO_PASSWORD, DEMO_USERS } from "./reset.js";
import { report, request, stringField } from "./http.js";
import { withDemo } from "./server.js";

const buyer = DEMO_USERS[0];
if (!buyer) throw new Error("missing demo user");

await withDemo(4401, async (base) => {
  const loggedIn = await request(base, "POST", "/auth/login", {
    body: { email: buyer.email, password: DEMO_PASSWORD },
  });
  report("login", loggedIn.status, loggedIn.status === 200);
  const accessToken = stringField(loggedIn.json, "accessToken");
  const refreshToken = stringField(loggedIn.json, "refreshToken");

  const noToken = await request(base, "GET", "/me");
  report("no-token", noToken.status, noToken.status === 401);

  const withToken = await request(base, "GET", "/me", { token: accessToken });
  report("with-token", withToken.status, withToken.status === 200);

  const refreshed = await request(base, "POST", "/auth/refresh", {
    body: { refreshToken },
  });
  report("refresh", refreshed.status, refreshed.status === 200);
  const nextRefresh = stringField(refreshed.json, "refreshToken");

  const loggedOut = await request(base, "POST", "/auth/logout", {
    token: accessToken,
    body: { refreshToken: nextRefresh },
  });
  report("logout", loggedOut.status, loggedOut.status === 200 || loggedOut.status === 204);

  const afterLogout = await request(base, "GET", "/me", { token: accessToken });
  report("after-logout", afterLogout.status, afterLogout.status === 401);

  const refreshAfterLogout = await request(base, "POST", "/auth/refresh", {
    body: { refreshToken: nextRefresh },
  });
  report(
    "refresh-after-logout",
    refreshAfterLogout.status,
    refreshAfterLogout.status === 401,
  );
});

process.exit(process.exitCode ?? 0);
