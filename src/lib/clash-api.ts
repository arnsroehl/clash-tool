type ClashApiEnvironment = {
  CLASH_OF_CLANS_API_TOKEN?: string;
  CLASH_OF_CLANS_API_PROXY_URL?: string;
  CLASH_OF_CLANS_API_PROXY_SECRET?: string;
};

type FetchImplementation = typeof fetch;

export class ClashApiConfigurationError extends Error {}
export class ClashApiConnectionError extends Error {}

function normalizeProxyUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ClashApiConfigurationError(
      "Die Clash-API-Proxy-URL ist ungültig.",
    );
  }
  const isLocalHttp =
    url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp)
    throw new ClashApiConfigurationError(
      "Die Clash-API-Proxy-URL muss HTTPS verwenden.",
    );
  if (url.username || url.password || url.search || url.hash)
    throw new ClashApiConfigurationError(
      "Die Clash-API-Proxy-URL darf keine Zugangsdaten oder Parameter enthalten.",
    );
  return url.toString().replace(/\/$/, "");
}

function assertAllowedPath(path: string) {
  if (!/^\/v1\/(players|clans)\/%23[0289PYLQGRJCUV]+$/i.test(path))
    throw new ClashApiConfigurationError("Ungültiger Clash-API-Pfad.");
}

export async function requestClashApi<T>(
  path: string,
  environment: ClashApiEnvironment = process.env as ClashApiEnvironment,
  fetchImpl: FetchImplementation = fetch,
): Promise<{ body: T | { message?: string }; ok: boolean; status: number }> {
  assertAllowedPath(path);
  const proxyUrl = environment.CLASH_OF_CLANS_API_PROXY_URL?.trim();
  const proxySecret = environment.CLASH_OF_CLANS_API_PROXY_SECRET?.trim();
  const directToken = environment.CLASH_OF_CLANS_API_TOKEN?.trim();

  let endpoint: string;
  let authorization: string;
  if (proxyUrl) {
    if (!proxySecret || proxySecret.length < 32)
      throw new ClashApiConfigurationError(
        "Das Clash-API-Proxy-Passwort fehlt oder ist zu kurz.",
      );
    endpoint = `${normalizeProxyUrl(proxyUrl)}${path}`;
    authorization = `Bearer ${proxySecret}`;
  } else if (directToken) {
    endpoint = `https://api.clashofclans.com${path}`;
    authorization = `Bearer ${directToken}`;
  } else {
    throw new ClashApiConfigurationError(
      "Die Clash-API ist noch nicht konfiguriert.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { authorization, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ClashApiConnectionError(
      "Die Clash-API ist momentan nicht erreichbar.",
    );
  }

  let body: T | { message?: string };
  try {
    body = (await response.json()) as T | { message?: string };
  } catch {
    throw new ClashApiConnectionError(
      "Die Clash-API hat eine ungültige Antwort geliefert.",
    );
  }
  return { body, ok: response.ok, status: response.status };
}
