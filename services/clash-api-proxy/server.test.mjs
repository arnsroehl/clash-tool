import assert from "node:assert/strict";
import test from "node:test";
import { handleProxyRequest } from "./server.mjs";

const env = {
  CLASH_OF_CLANS_API_TOKEN: "official-token",
  CLASH_PROXY_SHARED_SECRET: "a-secure-proxy-secret-with-32-chars",
};

test("reports whether the proxy is configured", async () => {
  const ready = await handleProxyRequest(
    new Request("https://proxy.example/health"),
    env,
  );
  const missing = await handleProxyRequest(
    new Request("https://proxy.example/health"),
    {},
  );
  assert.equal(ready.status, 200);
  assert.equal(missing.status, 503);
});

test("rejects unauthenticated and unsupported requests", async () => {
  const unauthorized = await handleProxyRequest(
    new Request("https://proxy.example/v1/players/%23P0Y"),
    env,
  );
  const unsupported = await handleProxyRequest(
    new Request("https://proxy.example/v1/locations", {
      headers: { authorization: `Bearer ${env.CLASH_PROXY_SHARED_SECRET}` },
    }),
    env,
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(unsupported.status, 404);
});

test("forwards only validated player and clan requests", async () => {
  let requestedUrl = "";
  let authorization = "";
  const response = await handleProxyRequest(
    new Request("https://proxy.example/v1/clans/%23P0Y", {
      headers: { authorization: `Bearer ${env.CLASH_PROXY_SHARED_SECRET}` },
    }),
    env,
    async (url, init) => {
      requestedUrl = url;
      authorization = init.headers.authorization;
      return Response.json({ tag: "#P0Y" });
    },
  );
  assert.equal(response.status, 200);
  assert.equal(
    requestedUrl,
    "https://api.clashofclans.com/v1/clans/%23P0Y",
  );
  assert.equal(authorization, "Bearer official-token");
  assert.deepEqual(await response.json(), { tag: "#P0Y" });
});
