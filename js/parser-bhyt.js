// BHYT (Bảo hiểm y tế) card text parser
// Handles OCR quirks specific to the BHYT card layout (e.g. split insurance code)

export function parseBHYTText(text) {
  function fixDate(s) { return (s || '').replace(/[\-\. ]/g, '/'); }

  // ── Insurance code ────────────────────────────────────────
  // OCR splits the code across lines due to the box layout on the card:
  //   Part 1: "DN|4 79"  ("|" is OCR misread of a space between prefix and region digits)
  //   Part 2: "791 101 31..." (separate line after other labels)
  let id = '';
  const p1 = text.match(/\b([A-Z]{2})[|\s]+(\d)\s+(\d{2})\b/);
  if (p1) {
    const part1   = `${p1[1]} ${p1[2]} ${p1[3]}`;
    const afterP1 = text.slice(text.indexOf(p1[0]) + p1[0].length);
    // Anchor to line-start so we don't accidentally match a year like "1989\n791..."
    const p2 = afterP1.match(/^(\d{3})\s+(\d{3})\s+(\d{2})/m);
    id = p2 ? `${part1} ${p2[1]} ${p2[2]} ${p2[3]}` : part1;
  }
  // Fallback: pure numeric code on same line, e.g. "Mã số: 0801503677"
  if (!id) {
    const numM = text.match(/M[aã]\s*[Ss][oố]\s*[:\-]\s*(\d{9,15})/i);
    if (numM) id = numM[1];
  }
  // Fallback: compact no-space variant "DN479791101 31"
  if (!id) {
    const compact = text.match(/\b([A-Z]{2}\d{10,13})\b/);
    if (compact) id = compact[1];
  }

  // ── Name ─────────────────────────────────────────────────
  let name = '';
  const nameM = text.match(/Họ\s*và\s*tên\s*[:\-]?\s*([^\n]+)/i);
  if (nameM) name = nameM[1].replace(/\s+/g, ' ').trim().toUpperCase();

  // ── DOB ──────────────────────────────────────────────────
  let dob = '';
  const dobM = text.match(/Ngày\s*sinh\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (dobM) dob = fixDate(dobM[1]);

  // ── Gender — usually on the same line as DOB ─────────────
  let gender = '';
  const gmF = text.match(/Giới\s*tính\s*[:\-]?\s*(Nam|Nữ|Nu)/i);
  if (gmF) gender = /^(nam)/i.test(gmF[1]) ? 'Nam' : 'Nữ';

  // ── Address / workplace ───────────────────────────────────
  let address = '';
  const adM = text.match(/Địa\s*chỉ\s*[:\-]?\s*([^\n]+)/i);
  if (adM) address = adM[1].trim();

  // ── Initial KCB registration (multi-line; ends before "Mã:" or "Giá trị") ──
  let kcb = '';
  const kcbM = text.match(/Nơi\s*ĐK\s*KCB\s*B[ĐD][^\n:]*[:\-]?\s*([\s\S]+?)(?=\s*Mã\s*[:\-]|\s*Giá\s*trị)/i);
  if (kcbM) kcb = kcbM[1].replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // ── KCB code ─────────────────────────────────────────────
  let kcb_code = '';
  const kcbCodeM = text.match(/Mã\s*[:\-]\s*([0-9]{2}\s*[-–]\s*[0-9]{3,})/i);
  if (kcbCodeM) kcb_code = kcbCodeM[1].trim();

  // ── Valid from date ───────────────────────────────────────
  let valid_from = '';
  const vfM = text.match(/Giá\s*trị\s*sử\s*dụng\s*[:\-]?\s*từ\s*ngày\s+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (vfM) valid_from = fixDate(vfM[1]);

  // ── 5-year continuous coverage milestone ─────────────────
  let five_year = '';
  const fyM = text.match(/5\s*năm\s*liên\s*tục\s*[:\-]?\s*từ\s+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
  if (fyM) five_year = fixDate(fyM[1]);

  return { id, name, dob, gender, address, kcb, kcb_code, valid_from, five_year };
}
