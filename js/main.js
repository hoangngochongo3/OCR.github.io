// Application entry point — orchestrates OCR flow and wires up all DOM event listeners
import { imageState, saState }                              from './state.js';
import { getAccessToken, resetTokenCache }                  from './auth.js';
import { callVisionAPI }                                    from './api.js';
import { handleDrag, handleDragLeave, handleDrop,
         previewImage }                                     from './input.js';
import { parseVisionText }                                  from './parser-cccd.js';
import { parseBHYTText }                                    from './parser-bhyt.js';
import { fillForm, fillBHYTForm, setStatus, setBHYTStatus,
         toggleRaw, toggleBHYTRaw, clearAll, clearBHYT }   from './form.js';

// ── CCCD OCR flow ─────────────────────────────────────────
async function runOCR() {
  if (!imageState.frontB64) { alert('Vui lòng tải ảnh mặt trước CCCD.'); return; }

  setStatus('loading', 'Đang xác thực và gửi ảnh đến Cloud Vision API…');
  document.getElementById('ocrBtn').disabled = true;

  try {
    const frontText = await callVisionAPI(imageState.frontB64);

    let backText = '';
    if (imageState.backB64) {
      setStatus('loading', 'Đang xử lý mặt sau…');
      backText = await callVisionAPI(imageState.backB64);
    }

    if (!frontText) throw new Error('Cloud Vision không nhận ra văn bản trong ảnh. Thử ảnh rõ hơn.');

    const parsed = parseVisionText(frontText, backText);

    document.getElementById('rawJson').textContent =
      frontText + (backText ? '\n\n--- MẶT SAU ---\n' + backText : '');

    fillForm(parsed);
    const filled = Object.values(parsed).filter(v => v).length;
    setStatus('success', `✅ Nhận diện thành công — đã điền ${filled} trường`);
  } catch (e) {
    setStatus('error', '❌ Lỗi: ' + e.message);
  } finally {
    document.getElementById('ocrBtn').disabled = false;
  }
}

// ── BHYT OCR flow ─────────────────────────────────────────
async function runBHYTOCR() {
  if (!imageState.bhytB64) { alert('Vui lòng tải ảnh thẻ BHYT.'); return; }

  setBHYTStatus('loading', 'Đang gửi ảnh đến Cloud Vision API…');
  document.getElementById('bhytBtn').disabled = true;

  try {
    const text = await callVisionAPI(imageState.bhytB64);
    if (!text) throw new Error('Không nhận ra văn bản trong ảnh. Thử ảnh rõ hơn.');

    document.getElementById('bhytRawJson').textContent = text;
    const parsed = parseBHYTText(text);
    fillBHYTForm(parsed);
    const filled = Object.values(parsed).filter(v => v).length;
    setBHYTStatus('success', `✅ Nhận diện thành công — đã điền ${filled} trường`);
  } catch (e) {
    setBHYTStatus('error', '❌ Lỗi: ' + e.message);
  } finally {
    document.getElementById('bhytBtn').disabled = false;
  }
}

// ── Connection test ───────────────────────────────────────
async function testConnection() {
  const el = document.getElementById('testResult');
  el.textContent = '⏳ Đang kiểm tra...';
  el.style.color = '#1a73e8';
  try {
    const token = await getAccessToken();
    // Send a 1×1 transparent PNG — enough to verify token validity and Vision API access
    const tiny = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
    const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ requests: [{ image: { content: tiny }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }),
    });
    if (res.ok || res.status === 400) {
      el.textContent = '✅ Kết nối thành công — Cloud Vision hoạt động';
      el.style.color = '#34a853';
    } else {
      const data = await res.json().catch(() => ({}));
      el.textContent = '❌ ' + (data?.error?.message || `HTTP ${res.status}`);
      el.style.color = '#ea4335';
    }
  } catch (e) {
    el.textContent = '❌ Lỗi: ' + e.message;
    el.style.color = '#ea4335';
  }
}

// ── SA key upload ─────────────────────────────────────────
function setupSAKeyUpload() {
  const fileInput = document.getElementById('saKeyFile');
  const statusEl  = document.getElementById('saKeyStatus');
  const clearBtn  = document.getElementById('saKeyClear');

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json.client_email || !json.private_key) {
          statusEl.textContent = '❌ File không hợp lệ (thiếu client_email hoặc private_key)';
          statusEl.style.color = '#ea4335';
          return;
        }
        saState.sa = { client_email: json.client_email, private_key: json.private_key };
        resetTokenCache();
        statusEl.textContent = `✅ ${json.client_email}`;
        statusEl.style.color = '#34a853';
        clearBtn.style.display = '';
        document.getElementById('testResult').textContent = '';
      } catch {
        statusEl.textContent = '❌ Không đọc được file JSON';
        statusEl.style.color = '#ea4335';
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  clearBtn.addEventListener('click', () => {
    saState.sa = null;
    resetTokenCache();
    statusEl.textContent = '⚠️ Chưa tải key';
    statusEl.style.color = '';
    clearBtn.style.display = 'none';
    document.getElementById('testResult').textContent = '';
  });
}

// ── Event wiring ──────────────────────────────────────────
function setupDragDrop(side) {
  const box       = document.getElementById(side + 'Box');
  const fileInput = document.getElementById(side + 'File');
  box.addEventListener('dragover',  e => handleDrag(e, side));
  box.addEventListener('dragleave', e => handleDragLeave(e, side));
  box.addEventListener('drop',      e => handleDrop(e, side));
  fileInput.addEventListener('change', e => previewImage(side, e.target));
}

document.addEventListener('DOMContentLoaded', () => {
  setupSAKeyUpload();
  document.getElementById('testBtn').addEventListener('click', testConnection);
  document.getElementById('ocrBtn').addEventListener('click', runOCR);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('rawToggleBtn').addEventListener('click', toggleRaw);
  document.getElementById('bhytBtn').addEventListener('click', runBHYTOCR);
  document.getElementById('clearBhytBtn').addEventListener('click', clearBHYT);
  document.getElementById('bhytRawToggleBtn').addEventListener('click', toggleBHYTRaw);

  setupDragDrop('front');
  setupDragDrop('back');
  setupDragDrop('bhyt');
});
