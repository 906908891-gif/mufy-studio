declare module "cloudflare:workers" {
  // Runtime bindings are injected by Cloudflare/Sites and vary per deployment.
  // Individual server modules narrow the keys they consume before use.
  export const env: Record<string, unknown> & {
    DB?: unknown;
    MINIMAX_API_KEY?: string;
    MINIMAX_API_HOST?: string;
  };
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

type D1Database = object;
