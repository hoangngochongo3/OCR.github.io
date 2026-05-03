// Application entry point — orchestrates OCR flow and wires up all DOM event listeners
import { imageState, saState }                              from './state.js';
import { getAccessToken, resetTokenCache }                  from './auth.js';
import { callGeminiOCR }                                    from './api.js';
import { handleDrag, handleDragLeave, handleDrop,
         previewImage }                                     from './input.js';
import { fillForm, fillBHYTForm, setStatus, setBHYTStatus,
         toggleRaw, toggleBHYTRaw, toggleParsed, toggleBHYTParsed,
         clearAll, clearBHYT }                              from './form.js';

// ── CCCD OCR flow ─────────────────────────────────────────
async function runOCR() {
  if (!imageState.frontB64) { alert('Vui lòng tải ảnh mặt trước CCCD.'); return; }

  setStatus('loading', 'Đang gửi ảnh đến Gemini 2.5 Flash…');
  document.getElementById('ocrBtn').disabled = true;

  try {
    const { raw, parsed } = await callGeminiOCR(
      'cccd',
      imageState.frontB64, imageState.frontMime,
      imageState.backB64,  imageState.backMime,
    );

    document.getElementById('rawJson').textContent    = raw;
    document.getElementById('parsedJson').textContent = JSON.stringify(parsed, null, 2);

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

  setBHYTStatus('loading', 'Đang gửi ảnh đến Gemini 2.5 Flash…');
  document.getElementById('bhytBtn').disabled = true;

  try {
    const { raw, parsed } = await callGeminiOCR(
      'bhyt',
      imageState.bhytB64, imageState.bhytMime,
    );

    document.getElementById('bhytRawJson').textContent    = raw;
    document.getElementById('bhytParsedJson').textContent = JSON.stringify(parsed, null, 2);

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
    await getAccessToken();
    el.textContent = '✅ Xác thực thành công — Service Account hợp lệ';
    el.style.color = '#34a853';
  } catch (e) {
    el.textContent = '❌ ' + e.message;
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
        if (!json.client_email || !json.private_key || !json.project_id) {
          statusEl.textContent = '❌ File không hợp lệ (thiếu client_email, private_key hoặc project_id)';
          statusEl.style.color = '#ea4335';
          return;
        }
        saState.sa = { client_email: json.client_email, private_key: json.private_key, project_id: json.project_id };
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
  document.getElementById('parsedToggleBtn').addEventListener('click', toggleParsed);
  document.getElementById('bhytBtn').addEventListener('click', runBHYTOCR);
  document.getElementById('clearBhytBtn').addEventListener('click', clearBHYT);
  document.getElementById('bhytRawToggleBtn').addEventListener('click', toggleBHYTRaw);
  document.getElementById('bhytParsedToggleBtn').addEventListener('click', toggleBHYTParsed);

  setupDragDrop('front');
  setupDragDrop('back');
  setupDragDrop('bhyt');
});
