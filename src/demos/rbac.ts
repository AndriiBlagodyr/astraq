import { DEMO_PASSWORD, DEMO_USERS } from "./reset.js";
import { report, request, stringField, tamperRole } from "./http.js";
import { withDemo } from "./server.js";

const buyer1 = DEMO_USERS[0];
const buyer2 = DEMO_USERS[1];
const seller = DEMO_USERS[2];
if (!buyer1 || !buyer2 || !seller) throw new Error("missing demo users");

await withDemo(4403, async (base) => {
  async function login(email: string) {
    const response = await request(base, "POST", "/auth/login", {
      body: { email, password: DEMO_PASSWORD },
    });
    if (response.status !== 200) throw new Error(`login ${email} status=${response.status}`);
    return stringField(response.json, "accessToken");
  }

  const buyerToken = await login(buyer1.email);
  const otherToken = await login(buyer2.email);
  const sellerToken = await login(seller.email);

  const anon = await request(base, "GET", "/orders/00000000-0000-4000-8000-000000000001");
  report("anon", anon.status, anon.status === 401);

  const created = await request(base, "POST", "/orders", { token: buyerToken, body: {} });
  if (created.status !== 201) throw new Error(`create order status=${created.status}`);
  const orderId = stringField(created.json, "id");

  const own = await request(base, "GET", `/orders/${orderId}`, { token: buyerToken });
  report("own", own.status, own.status === 200);

  const foreign = await request(base, "GET", `/orders/${orderId}`, { token: otherToken });
  report("foreign", foreign.status, foreign.status === 403);

  const roleDenied = await request(base, "POST", "/products", {
    token: buyerToken,
    body: { name: "Notebook" },
  });
  report("role-denied", roleDenied.status, roleDenied.status === 403);

  const roleAllowed = await request(base, "POST", "/products", {
    token: sellerToken,
    body: { name: "Notebook" },
  });
  report(
    "role-allowed",
    roleAllowed.status,
    roleAllowed.status === 200 || roleAllowed.status === 201,
  );

  const tampered = await request(base, "POST", "/products", {
    token: tamperRole(buyerToken),
    body: { name: "Forged" },
  });
  report("tampered", tampered.status, tampered.status === 401);
});

process.exit(process.exitCode ?? 0);
