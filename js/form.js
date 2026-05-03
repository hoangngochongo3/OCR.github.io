// Form filling and UI helper functions for CCCD and BHYT sections
import { FIELD_MAP, BHYT_FIELD_MAP } from './config.js';
import { imageState } from './state.js';

// Writes parsed data into the CCCD form; marks filled fields with a green border
export function fillForm(data) {
  for (const [key, fieldId] of Object.entries(FIELD_MAP)) {
    const el  = document.getElementById(fieldId);
    if (!el) continue;
    const val = (data[key] || '').trim();
    if (el.tagName === 'SELECT') {
      const opt = [...el.options].find(o => o.value === val || o.text === val);
      if (opt) el.value = opt.value;
    } else {
      el.value = val;
    }
    val ? el.classList.add('filled') : el.classList.remove('filled');
  }
}

// Writes parsed data into the BHYT form
export function fillBHYTForm(data) {
  for (const [key, fieldId] of Object.entries(BHYT_FIELD_MAP)) {
    const el  = document.getElementById(fieldId);
    if (!el) continue;
    const val = (data[key] || '').trim();
    if (el.tagName === 'SELECT') {
      const opt = [...el.options].find(o => o.value === val || o.text === val);
      if (opt) el.value = opt.value;
    } else {
      el.value = val;
    }
    val ? el.classList.add('filled') : el.classList.remove('filled');
  }
}

// Updates the CCCD status bar (type: 'loading' | 'success' | 'error')
export function setStatus(type, msg) {
  const bar  = document.getElementById('statusBar');
  const text = document.getElementById('statusText');
  const spin = document.getElementById('statusSpinner');
  bar.className           = 'status-bar show ' + type;
  text.textContent        = msg;
  spin.style.display      = type === 'loading' ? 'block' : 'none';
}

// Updates the BHYT status bar
export function setBHYTStatus(type, msg) {
  const bar  = document.getElementById('bhytStatusBar');
  const text = document.getElementById('bhytStatusText');
  const spin = document.getElementById('bhytStatusSpinner');
  bar.className           = 'status-bar show ' + type;
  text.textContent        = msg;
  spin.style.display      = type === 'loading' ? 'block' : 'none';
}

export function toggleRaw() {
  const el   = document.getElementById('rawJson');
  const btn  = document.getElementById('rawToggleBtn');
  const open = el.classList.toggle('show');
  btn.textContent = (open ? '▼' : '▶') + ' Xem văn bản OCR thô';
}

export function toggleBHYTRaw() {
  const el   = document.getElementById('bhytRawJson');
  const btn  = document.getElementById('bhytRawToggleBtn');
  const open = el.classList.toggle('show');
  btn.textContent = (open ? '▼' : '▶') + ' Xem văn bản OCR thô (BHYT)';
}

// Resets CCCD images, form fields, and status bar
export function clearAll() {
  ['front', 'back'].forEach(side => {
    document.getElementById(side + 'Box').classList.remove('has-image');
    document.getElementById(side + 'Preview').src = '';
    document.getElementById(side + 'File').value  = '';
  });
  imageState.frontB64 = imageState.frontMime = imageState.backB64 = imageState.backMime = null;

  Object.values(FIELD_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.classList.remove('filled');
  });

  document.getElementById('rawJson').textContent = '';
  document.getElementById('rawJson').classList.remove('show');
  document.getElementById('statusBar').className = 'status-bar';
}

// Resets BHYT image, form fields, and status bar
export function clearBHYT() {
  document.getElementById('bhytBox').classList.remove('has-image');
  document.getElementById('bhytPreview').src  = '';
  document.getElementById('bhytFile').value   = '';
  imageState.bhytB64 = imageState.bhytMime    = null;

  Object.values(BHYT_FIELD_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.classList.remove('filled');
  });

  document.getElementById('bhytRawJson').textContent = '';
  document.getElementById('bhytRawJson').classList.remove('show');
  document.getElementById('bhytStatusBar').className = 'status-bar';
}
