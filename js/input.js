// Image input handling: file selection, drag-and-drop, preview rendering
import { imageState } from './state.js';

export function handleDrag(e, side) {
  e.preventDefault();
  document.getElementById(side + 'Box').classList.add('dragover');
}

export function handleDragLeave(e, side) {
  document.getElementById(side + 'Box').classList.remove('dragover');
}

export function handleDrop(e, side) {
  e.preventDefault();
  document.getElementById(side + 'Box').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(side, file);
}

export function previewImage(side, input) {
  if (!input.files[0]) return;
  loadFile(side, input.files[0]);
}

// Reads a File object into base64, updates imageState, and renders the preview thumbnail
export function loadFile(side, file) {
  if (!file.type.startsWith('image/')) { alert('Vui lòng chọn file ảnh.'); return; }
  if (file.size > 10 * 1024 * 1024)   { alert('File quá lớn (tối đa 10MB).'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl        = e.target.result;
    const [header, b64]  = dataUrl.split(',');
    const mime           = header.match(/:(.*?);/)[1];

    imageState[side + 'B64']  = b64;
    imageState[side + 'Mime'] = mime;

    document.getElementById(side + 'Preview').src = dataUrl;
    document.getElementById(side + 'Box').classList.add('has-image');
  };
  reader.readAsDataURL(file);
}
