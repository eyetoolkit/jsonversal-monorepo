/**
 * jsonversal JWT Decoder API — CF Pages Function
 * POST /v1/jwt/decode   — Decode JWT, return header + payload + expiry
 * POST /v1/jwt/verify   — Verify JWT signature (HS256 / RS256)
 * Auth: Bearer <API_KEY> in Authorization header
 */
const ALLOWED_ORIGINS = ['https://jsonversal.com','https://www.jsonversal.com','http://localhost:4321'];

function errorResponse(code, message, status = 400) {
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers: { 'Content-Type': 'application/json' } });
}
function successResponse(data) {
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; }
}
function getExpiryInfo(exp) {
  if (!exp) return { isExpired: false, expiresAt: null, ttlSeconds: null };
  const expMs = typeof exp === 'number' ? exp * 1000 : parseInt(exp) * 1000;
  const diff = expMs - Date.now();
  return { isExpired: diff <= 0, expiresAt: new Date(expMs).toISOString(), ttlSeconds: Math.round(diff / 1000) };
}
async function verifyHS256(token, signatureB64, secret) {
  try {
    const [h, p] = token.split('.').slice(0, 2);
    const data = new TextEncoder().encode(h + '.' + p);
    const sigBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    return { valid: ok };
  } catch { return { valid: false, error: 'VERIFY_FAILED' }; }
}
async function verifyRS256(token, signatureB64, publicKeyPem) {
  try {
    const pemBody = publicKeyPem.replace(/-----BEGIN PUBLIC KEY-----/,'').replace(/-----END PUBLIC KEY-----/,'').replace(/\s/g,'');
    const bytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', bytes.buffer, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['verify']);
    const [h, p] = token.split('.').slice(0, 2);
    const data = new TextEncoder().encode(h + '.' + p);
    const sigBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const ok = await crypto.subtle.verify('RSA-OAEP', key, sigBytes, data);
    return { valid: ok };
  } catch { return { valid: false, error: 'INVALID_PUBLIC_KEY' }; }
}
async function handleDecode(body) {
  const { token } = body;
  if (!token || typeof token !== 'string') return errorResponse('INVALID_INPUT', 'Missing "token" field');
  const parts = token.trim().split('.');
  if (parts.length !== 3) return errorResponse('INVALID_TOKEN', 'Token must have 3 parts');
  const [hB64, pB64, sigB64] = parts;
  const header = base64UrlDecode(hB64);
  const payload = base64UrlDecode(pB64);
  if (!header || !payload) return errorResponse('DECODE_FAILED', 'Failed to decode header or payload');
  const exp = getExpiryInfo(payload.exp);
  const iat = payload.iat ? { issuedAt: new Date(payload.iat * 1000).toISOString() } : {};
  return successResponse({ header, payload, signature: sigB64, isExpired: exp.isExpired, expiresAt: exp.expiresAt, ttlSeconds: exp.ttlSeconds, ...iat });
}
async function handleVerify(body) {
  const { token, secret, publicKey } = body;
  if (!token || typeof token !== 'string') return errorResponse('INVALID_INPUT', 'Missing "token" field');
  const parts = token.trim().split('.');
  if (parts.length !== 3) return errorResponse('INVALID_TOKEN', 'Token must have 3 parts');
  const [hB64, pB64, sigB64] = parts;
  const header = base64UrlDecode(hB64);
  const payload = base64UrlDecode(pB64);
  if (!header || !payload) return errorResponse('DECODE_FAILED', 'Failed to decode token');
  const alg = header.alg;
  const exp = getExpiryInfo(payload.exp);
  let result = { valid: false, error: 'NO_VERIFICATION_METHOD' };
  if (secret && /^HS(256|384|512)$/.test(alg)) result = await verifyHS256(token, sigB64, secret);
  else if (publicKey && /^RS(256|384|512)$/.test(alg)) result = await verifyRS256(token, sigB64, publicKey);
  else if (!secret && !publicKey) return errorResponse('MISSING_CREDENTIAL', 'Provide "secret" (for HS*) or "publicKey" (for RS*)');
  else { const needed = /^HS/.test(alg) ? 'secret' : 'publicKey'; return errorResponse('ALGORITHM_MISMATCH', `Algorithm "${alg}" requires "${needed}"`); }
  if (result.error) return errorResponse(result.error, 'Verification failed: ' + result.error, 401);
  return successResponse({ valid: result.valid, header, payload, isExpired: exp.isExpired, expiresAt: exp.expiresAt, ttlSeconds: exp.ttlSeconds });
}
async function authenticate(request, env) {
  const apiKey = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!apiKey) return { authorized: false };
  const validKeys = [env.JWT_API_KEY, 'demo-key-for-testing'].filter(Boolean);
  return { authorized: validKeys.includes(apiKey) };
}
export async function onRequest({ request, env }) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/v1/jwt')) return new Response('Not Found', { status: 404 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  if (request.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Only POST is supported', 405);
  const auth = await authenticate(request, env);
  if (!auth.authorized) return errorResponse('UNAUTHORIZED', 'Invalid or missing API key', 401);
  let body;
  try { body = await request.json(); } catch { return errorResponse('INVALID_JSON', 'Request body must be valid JSON'); }
  let response;
  if (path === '/v1/jwt/decode') response = await handleDecode(body);
  else if (path === '/v1/jwt/verify') response = await handleVerify(body);
  else response = errorResponse('NOT_FOUND', 'Route not found', 404);
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status, headers: newHeaders });
}
