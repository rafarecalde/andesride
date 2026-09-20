// Cloudflare Worker entry. Dispatches POST/OPTIONS /create-checkout (and POST
// /webhook) so wrangler can deploy this folder as a single worker.
import { onRequestPost as createCheckout, onRequestOptions as createCheckoutOptions } from './create-checkout.js';
import { onRequestPost as webhook } from './webhook.js';

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function methodNotAllowed(allow) {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allow },
  });
}

export default {
  async fetch(request, env) {
    const path = normalizePath(new URL(request.url).pathname);

    if (path === '/create-checkout') {
      if (request.method === 'OPTIONS') return createCheckoutOptions({ request, env });
      if (request.method === 'POST') return createCheckout({ request, env });
      return methodNotAllowed('POST, OPTIONS');
    }

    if (path === '/webhook') {
      if (request.method === 'POST') return webhook({ request, env });
      return methodNotAllowed('POST');
    }

    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
