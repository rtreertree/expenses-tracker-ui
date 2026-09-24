interface Env {
  API_TOKEN: string;
  ASSETS: Fetcher;
}

const API_ORIGIN = 'https://budget.rtreertree.com';
const API_PREFIX = '/api/v1/';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

const proxyApiRequest = async (request: Request, env: Env) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!env.API_TOKEN) return new Response('API_TOKEN is not configured', { status: 500 });

  const url = new URL(request.url);
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete('Authorization');
  upstreamHeaders.set('Authorization', `Bearer ${env.API_TOKEN}`);
  upstreamHeaders.delete('Host');

  const response = await fetch(`${API_ORIGIN}${url.pathname}${url.search}`, {
    method: request.method,
    headers: upstreamHeaders,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  });
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([name, value]) => headers.set(name, value));
  return new Response(response.body, { status: response.status, headers });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith(API_PREFIX)) return proxyApiRequest(request, env);
    return env.ASSETS.fetch(request);
  },
};