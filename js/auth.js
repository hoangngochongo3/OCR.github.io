// Google OAuth2 authentication via Service Account JWT
// Flow: sign JWT with private key → exchange at oauth2.googleapis.com → get Bearer token
import { saState } from './state.js';

let _token = null, _tokenExp = 0;

export function resetTokenCache() { _token = null; _tokenExp = 0; }

// Encode string to URL-safe base64 (used in JWT header/payload)
function b64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Encode ArrayBuffer to URL-safe base64 (used for JWT signature)
function b64urlBuf(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Returns a cached access token, refreshing 5 min before the 1-hour expiry
export async function getAccessToken() {
  const SA = saState.sa;
  if (!SA) throw new Error('Chưa tải Service Account key. Vui lòng upload file JSON trước.');

  const now = Math.floor(Date.now() / 1000);
  if (_token && now < _tokenExp) return _token;

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss:   SA.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));

  const pemBody  = SA.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  const jwt = `${header}.${payload}.${b64urlBuf(sigBuf)}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || `Token error ${res.status}`);

  _token    = data.access_token;
  _tokenExp = now + 3300; // cache 55 min
  return _token;
}
