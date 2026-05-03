// Google Cloud Vision API — DOCUMENT_TEXT_DETECTION wrapper
import { getAccessToken } from './auth.js';

// Sends a base64-encoded image to Vision API and returns the full detected text string
export async function callVisionAPI(b64) {
  const token = await getAccessToken();
  const body  = {
    requests: [{
      image:    { content: b64 },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    }],
  };

  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const resp = data?.responses?.[0];
  if (resp?.error) throw new Error(resp.error.message);
  return resp?.fullTextAnnotation?.text || '';
}
