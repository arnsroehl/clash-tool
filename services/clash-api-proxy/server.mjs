import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";

const TAG_PATTERN = /^[0289PYLQGRJCUV]+$/;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function secretsMatch(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function readBearerToken(request) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function parseAllowedPath(pathname) {
  const match = pathname.match(/^\/v1\/(players|clans)\/(?:%23)?([^/]+)$/i);
  if (!match) return null;
  const tag = decodeURIComponent(match[2]).toUpperCase();
  if (!TAG_PATTERN.test(tag)) return null;
  return { resource: match[1].toLowerCase(), tag: `#${tag}` };
}

export async function handleProxyRequest(
  request,
  env = process.env,
  fetchImpl = fetch,
) {
  const apiToken = env.CLASH_OF_CLANS_API_TOKEN || "";
  const proxySecret = env.CLASH_PROXY_SHARED_SECRET || "";
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return apiToken && proxySecret.length >= 32
      ? jsonResponse({ status: "ok" })
      : jsonResponse({ status: "configuration_missing" }, 503);
  }

  if (request.method !== "GET")
    return jsonResponse({ error: "Method not allowed." }, 405);
  if (!apiToken || proxySecret.length < 32)
    return jsonResponse({ error: "Proxy is not configured." }, 503);
  if (!secretsMatch(readBearerToken(request), proxySecret))
    return jsonResponse({ error: "Unauthorized." }, 401);

  const target = parseAllowedPath(url.pathname);
  if (!target) return jsonResponse({ error: "Not found." }, 404);

  let upstream;
  try {
    upstream = await fetchImpl(
      `https://api.clashofclans.com/v1/${target.resource}/${encodeURIComponent(target.tag)}`,
      {
        headers: {
          authorization: `Bearer ${apiToken}`,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      },
    );
  } catch {
    return jsonResponse({ error: "Clash API is unavailable." }, 502);
  }

  const body = new Uint8Array(await upstream.arrayBuffer());
  if (body.byteLength > MAX_RESPONSE_BYTES)
    return jsonResponse({ error: "Upstream response is too large." }, 502);

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function startServer() {
  const port = Number(process.env.PORT || 3001);
  const server = createServer(async (request, response) => {
    const origin = `http://${request.headers.host || "localhost"}`;
    const proxyResponse = await handleProxyRequest(
      new Request(new URL(request.url || "/", origin), {
        method: request.method,
        headers: request.headers,
      }),
    );
    response.writeHead(proxyResponse.status, Object.fromEntries(proxyResponse.headers));
    response.end(Buffer.from(await proxyResponse.arrayBuffer()));
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Clash API proxy listening on port ${port}.`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  startServer();
