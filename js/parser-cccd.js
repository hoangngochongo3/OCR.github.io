// CCCD/CMND text parser — converts raw Vision API text to structured fields
// Uses regex + heuristics to handle common OCR misreads on Vietnamese ID cards

export function parseVisionText(frontText, backText) {
  const back = backText || '';

  // Returns the inline capture group[1], or the first non-empty line after the label match
  function grab(labelRe, src) {
    const m = src.match(labelRe);
    if (!m) return '';
    const inline = (m[1] || '').trim();
    if (inline) return inline;
    const rest = src.slice(m.index + m[0].length);
    return rest.replace(/^[ \t]*\n[ \t]*/, '').split('\n')[0].trim();
  }

  function fixDate(s) { return (s || '').replace(/[\-\. ]/g, '/'); }

  // ── ID ────────────────────────────────────────────────────
  // OCR often misreads "Số" as "S6", "So", "S0", etc.
  let id = '';
  const idM = frontText.match(/(?:S[oốoÔ60]\s*[\/|I]\s*No\.?\s*:|Số\s*CCCD\s*:|Số\s*CMND\s*:)\s*([0-9]{9,12})/i);
  if (idM) id = idM[1];
  if (!id) { const m = frontText.match(/\b([0-9]{12})\b/); if (m) id = m[1]; }
  if (!id) { const m = frontText.match(/\b([0-9]{9})\b/);  if (m) id = m[1]; }

  // ── Name ─────────────────────────────────────────────────
  // Bilingual separator "I" (OCR misread of "/") in "Họ và tên I Full name:" forces inline to be empty
  // → grab() falls back to next line which contains the actual name
  let name = grab(/Họ\s*và\s*tên[^\n:]*:[ \t]*([^\n]*)/i, frontText);
  if (name) {
    name = name.replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  if (!name) {
    const lines = frontText.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (/Họ\s*và\s*tên/i.test(lines[i])) {
        const nxt = lines[i + 1].replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (nxt.length > 3 && /\s/.test(nxt)) { name = nxt; break; }
      }
    }
  }

  // ── DOB ──────────────────────────────────────────────────
  let dob = '';
  const dobM = frontText.match(
    /(?:Ngày\s*sinh[^\n:]*:|Sinh\s*ngày[^\n:]*:)\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i
  );
  if (dobM) dob = fixDate(dobM[1]);
  if (!dob) {
    const m = frontText.match(/(?:Ngày\s*sinh|Sinh\s*ngày)[^\d]*([0-9]{1,2}[\s\-\.][0-9]{1,2}[\s\-\.][0-9]{4})/i);
    if (m) dob = fixDate(m[1]);
  }

  // ── Gender ───────────────────────────────────────────────
  let gender = '';
  const gm = frontText.match(/Giới\s*tính[^\n:]*:\s*(Nam|Nữ|Nu|Male|Female)/i);
  if (gm) gender = /^(nam|male)/i.test(gm[1]) ? 'Nam' : 'Nữ';

  // ── Nationality ──────────────────────────────────────────
  let nationality = '';
  const natM = frontText.match(/Quốc\s*tịch[^\n:]*:\s*([^\n]+)/i);
  if (natM) nationality = natM[1].replace(/\s+(?:Dân\s*tộc|Ethnicity|Tôn\s*giáo|Religion).*/i, '').trim();

  // ── Ethnicity ────────────────────────────────────────────
  let ethnicity = '';
  const ethM = frontText.match(/Dân\s*tộc[^\n:]*:\s*([^\n]+)/i);
  if (ethM) ethnicity = ethM[1].replace(/\s+(?:Tôn\s*giáo|Religion|Quê\s*quán|Place).*/i, '').trim();

  // ── Hometown ─────────────────────────────────────────────
  // Multi-line capture: stop just before "Nơi thường trú"
  let hometown = '';
  const hmMulti = frontText.match(
    /Quê\s*quán[^\n:]*:?[ \t]*([\s\S]+?)(?=\n[ \t]*(?:Nơi\s*thường\s*trú|Place\s*of\s*res))/i
  );
  if (hmMulti) {
    hometown = hmMulti[1].replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  } else {
    hometown = grab(/Quê\s*quán[^\n:]*:[ \t]*([^\n]*)/i, frontText);
  }

  // ── Address ──────────────────────────────────────────────
  // Stop at expiry label OR end of text (expiry can appear before address in OCR scan order)
  let address = '';
  const adMulti = frontText.match(
    /Nơi\s*thường\s*trú[^\n:]*:?[ \t]*([\s\S]+?)(?=\n[ \t]*(?:Có\s*giá\s*trị|Date\s*of\s*expiry|Ngày\s*hết\s*hạn)|\s*$)/i
  );
  if (adMulti) address = adMulti[1].replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!address) {
    const cm = frontText.match(/(?:Nơi\s*ĐKHK\s*thường\s*trú|Hộ\s*khẩu\s*thường\s*trú)[^\n:]*:?[ \t]*([\s\S]+?)(?=\n[ \t]*(?:Có\s*giá\s*trị)|\s*$)/i);
    if (cm) address = cm[1].replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }
  if (!address) address = grab(/Nơi\s*thường\s*trú[^\n:]*:[ \t]*([^\n]*)/i, frontText);

  // ── Expiry ───────────────────────────────────────────────
  // Pattern: "Có giá trị đến 06/08/2028" — no colon; optional bilingual suffix stripped
  let expiry = '';
  const exM = frontText.match(/Có\s*giá\s*trị\s*đến\s*(?:[^:\d\n]*:)?\s*([^\n]+)/i);
  if (exM) {
    let v  = exM[1].replace(/\/?\s*Date\s*of\s*expiry.*/i, '').trim();
    const dm = v.match(/([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/);
    expiry = /không\s*thời\s*hạn/i.test(v) ? 'Không thời hạn' : (dm ? fixDate(dm[1]) : v);
  }
  if (!expiry && /không\s*thời\s*hạn/i.test(frontText)) expiry = 'Không thời hạn';
  if (!expiry) {
    const m = frontText.match(/Ngày\s*hết\s*hạn[^\n:]*:\s*([^\n]+)/i);
    if (m) expiry = m[1].trim();
  }

  // ── Issued date ──────────────────────────────────────────
  // Prefer back side (date stamp by issuing authority); fall back to front "Ngày cấp"
  let issued = '';
  if (back) {
    const bm = back.match(/(?:Ngày[,\s]*tháng[,\s]*năm[^\n:]*:|Date\s*:)\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
    if (bm) issued = fixDate(bm[1]);
    if (!issued) {
      const all = [...back.matchAll(/\b([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})\b/g)];
      if (all.length) issued = all[all.length - 1][1];
    }
  }
  if (!issued) {
    const cm = frontText.match(/Ngày\s*cấp[^\n:]*:?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
    if (cm) issued = fixDate(cm[1]);
  }

  // ── Extra (issuing authority / identifying features) ─────
  let extra = '';
  if (back) {
    const xm = back.match(/Đặc\s*điểm\s*nhận\s*dạng[^\n:]*:?[ \t]*([\s\S]+?)(?=\n[ \t]*(?:Ngày|Date)|\s*$)/i);
    if (xm) extra = xm[1].replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }
  if (!extra) {
    const m = frontText.match(/(?:Nơi\s*cấp|CQ\s*cấp)[^\n:]*:?\s*([^\n]+)/i);
    if (m) extra = m[1].trim();
  }

  return { id, name, dob, gender, nationality, ethnicity, hometown, address, expiry, issued, extra };
}
