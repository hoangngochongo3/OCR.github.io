// Gemini 2.5 Flash on Vertex AI — multimodal OCR wrapper
import { getAccessToken } from './auth.js';
import { saState }        from './state.js';
import { GEMINI_MODEL, GEMINI_REGION, CCCD_PROMPT, BHYT_PROMPT } from './config.js';

// type: 'cccd' | 'bhyt'
// frontB64/frontMime: required image (front side for CCCD, card image for BHYT)
// backB64/backMime:   optional back side (CCCD only)
export async function callGeminiOCR(type, frontB64, frontMime, backB64, backMime) {
  const token     = await getAccessToken();
  const projectId = saState.sa.project_id;
  const prompt    = type === 'cccd' ? CCCD_PROMPT : BHYT_PROMPT;

  const parts = [{ text: prompt }];
  parts.push({ inline_data: { mime_type: frontMime || 'image/jpeg', data: frontB64 } });

  if (backB64) {
    parts.push({ text: 'Đây là mặt sau của thẻ CCCD:' });
    parts.push({ inline_data: { mime_type: backMime || 'image/jpeg', data: backB64 } });
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  };

  const url = `https://${GEMINI_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${GEMINI_REGION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

  const res = await fetch(url, {
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

  const data    = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini trả về dữ liệu không hợp lệ. Vui lòng thử lại với ảnh rõ hơn.');
  }

  return { raw: rawText, parsed };
}
