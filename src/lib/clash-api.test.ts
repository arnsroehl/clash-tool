import assert from "node:assert/strict";
import test from "node:test";
import {
  ClashApiConfigurationError,
  requestClashApi,
} from "./clash-api";

test("uses the authenticated proxy when configured", async () => {
  let url = "";
  let authorization = "";
  const result = await requestClashApi<{ tag: string }>(
    "/v1/players/%23P0Y",
    {
      CLASH_OF_CLANS_API_PROXY_URL: "https://proxy.example/",
      CLASH_OF_CLANS_API_PROXY_SECRET:
        "a-secure-proxy-secret-with-32-chars",
    },
    async (input, init) => {
      url = input.toString();
      authorization = new Headers(init?.headers).get("authorization") || "";
      return Response.json({ tag: "#P0Y" });
    },
  );
  assert.equal(url, "https://proxy.example/v1/players/%23P0Y");
  assert.equal(
    authorization,
    "Bearer a-secure-proxy-secret-with-32-chars",
  );
  assert.deepEqual(result.body, { tag: "#P0Y" });
});

test("keeps direct official API hosting as a fallback", async () => {
  let url = "";
  await requestClashApi(
    "/v1/clans/%23P0Y",
    { CLASH_OF_CLANS_API_TOKEN: "official-token" },
    async (input) => {
      url = input.toString();
      return Response.json({ tag: "#P0Y" });
    },
  );
  assert.equal(url, "https://api.clashofclans.com/v1/clans/%23P0Y");
});

test("rejects incomplete or unsafe proxy configuration", async () => {
  await assert.rejects(
    requestClashApi("/v1/players/%23P0Y", {
      CLASH_OF_CLANS_API_PROXY_URL: "https://proxy.example",
    }),
    ClashApiConfigurationError,
  );
  await assert.rejects(
    requestClashApi("/v1/players/%23P0Y", {
      CLASH_OF_CLANS_API_PROXY_URL: "http://proxy.example",
      CLASH_OF_CLANS_API_PROXY_SECRET:
        "a-secure-proxy-secret-with-32-chars",
    }),
    ClashApiConfigurationError,
  );
});
