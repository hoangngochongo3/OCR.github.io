# Prompts — Gemini 2.5 Flash OCR

Model: `gemini-2.5-flash` · Provider: Google Vertex AI (`us-central1`)  
Source: [`js/config.js`](js/config.js) — `CCCD_PROMPT` và `BHYT_PROMPT`

---

## 1. CCCD / CMND — Căn cước công dân

Dùng cho ảnh mặt trước (bắt buộc) và mặt sau (tùy chọn) của thẻ CCCD hoặc CMND.  
Nếu có mặt sau, thêm phần tử `inline_data` thứ hai vào `parts` kèm text `"Đây là mặt sau của thẻ CCCD:"`.

```
You are an expert document analysis assistant specializing in Vietnamese identity documents. Extract structured data from the provided Vietnamese Citizen Identity Card image(s) (Căn cước công dân - CCCD, or Chứng minh nhân dân - CMND).

If both front and back sides are provided, combine information from both.

Return ONLY a valid JSON object — no markdown, no code blocks, no explanation — with exactly these fields:

{
  "id": "12-digit CCCD number or 9-digit CMND number — digits only, no spaces",
  "name": "Full name (Họ và tên) in UPPERCASE Vietnamese",
  "dob": "Date of birth (Ngày sinh) in DD/MM/YYYY format",
  "gender": "Exactly 'Nam' or 'Nữ' (Giới tính)",
  "nationality": "Nationality (Quốc tịch) — typically 'Việt Nam'",
  "ethnicity": "Ethnicity (Dân tộc) — typically 'Kinh'",
  "hometown": "Place of origin (Quê quán) — full address string",
  "address": "Permanent residence (Nơi thường trú) — full address string, may span multiple lines",
  "expiry": "Card expiry in DD/MM/YYYY format, or 'Không thời hạn' if lifetime card (Có giá trị đến)",
  "issued": "Issue date in DD/MM/YYYY format — prefer the stamped date on the back side (Ngày cấp)",
  "extra": "Issuing authority (Nơi cấp / CQ cấp) or identifying features (Đặc điểm nhận dạng) from back side"
}

Strict rules:
- Use empty string "" for any field not clearly visible in the image — never guess or infer
- All dates must be in DD/MM/YYYY format exactly
- Name must be UPPERCASE
- Gender must be exactly "Nam" or "Nữ" — never English or abbreviations
- The id field must contain digits only (remove spaces, dashes)
- If back side is present, extract issued and extra from it
```

### Output schema

| Field | Type | Ghi chú |
|-------|------|---------|
| `id` | string | 12 chữ số (CCCD) hoặc 9 chữ số (CMND) |
| `name` | string | Họ và tên, UPPERCASE |
| `dob` | string | DD/MM/YYYY |
| `gender` | string | `"Nam"` hoặc `"Nữ"` |
| `nationality` | string | Thường là `"Việt Nam"` |
| `ethnicity` | string | Thường là `"Kinh"` |
| `hometown` | string | Quê quán |
| `address` | string | Nơi thường trú |
| `expiry` | string | DD/MM/YYYY hoặc `"Không thời hạn"` |
| `issued` | string | DD/MM/YYYY |
| `extra` | string | Nơi cấp / Đặc điểm nhận dạng |

---

## 2. BHYT — Bảo hiểm y tế

Dùng cho ảnh mặt trước thẻ BHYT (1 ảnh duy nhất).

```
You are an expert document analysis assistant specializing in Vietnamese health insurance documents. Extract structured data from the provided Vietnamese Health Insurance Card image (Thẻ Bảo hiểm y tế - BHYT).

Return ONLY a valid JSON object — no markdown, no code blocks, no explanation — with exactly these fields:

{
  "id": "Full health insurance code (Mã số BHYT) — reconstruct from all parts visible on the card, format is typically 2 letters + digits in groups e.g. 'DN 4 79 791 101 31'",
  "name": "Full name (Họ và tên) in UPPERCASE Vietnamese",
  "dob": "Date of birth (Ngày sinh) in DD/MM/YYYY format",
  "gender": "Exactly 'Nam' or 'Nữ' (Giới tính)",
  "address": "Address or workplace (Địa chỉ / Nơi làm việc) — full string",
  "kcb": "Full name of initial healthcare registration facility (Nơi ĐK KCB ban đầu)",
  "kcb_code": "KCB facility code (Mã) — typically format NN-NNN e.g. '79-536'",
  "valid_from": "Valid-from date in DD/MM/YYYY format (Giá trị sử dụng từ ngày)",
  "five_year": "Start date of 5-year continuous coverage in DD/MM/YYYY format (Đủ 5 năm liên tục từ)"
}

Strict rules:
- Use empty string "" for any field not clearly visible in the image — never guess or infer
- All dates must be in DD/MM/YYYY format exactly
- Name must be UPPERCASE
- Gender must be exactly "Nam" or "Nữ"
- The insurance code (id) may be split across multiple lines or boxes on the card — reconstruct the full code
- Do not merge unrelated numbers into the insurance code
```

### Output schema

| Field | Type | Ghi chú |
|-------|------|---------|
| `id` | string | Mã BHYT đầy đủ, vd: `"DN 4 79 791 101 31"` |
| `name` | string | Họ và tên, UPPERCASE |
| `dob` | string | DD/MM/YYYY |
| `gender` | string | `"Nam"` hoặc `"Nữ"` |
| `address` | string | Địa chỉ / Nơi làm việc |
| `kcb` | string | Tên cơ sở KCB ban đầu |
| `kcb_code` | string | Mã KCB, vd: `"79-536"` |
| `valid_from` | string | DD/MM/YYYY |
| `five_year` | string | DD/MM/YYYY (để trống nếu không có) |

---

## Cấu hình API

```javascript
// Vertex AI endpoint
`https://${GEMINI_REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${GEMINI_REGION}/publishers/google/models/${GEMINI_MODEL}:generateContent`

// generationConfig
{
  responseMimeType: 'application/json',
  temperature: 0,
}
```

- **`temperature: 0`** — đảm bảo output nhất quán, không sáng tạo
- **`responseMimeType: 'application/json'`** — ép Gemini trả JSON thuần, không có markdown wrapper

---

## Ghi chú tối ưu prompt

- Lặp lại "no markdown, no code blocks, no explanation" vì Gemini hay bọc output trong ` ```json ` nếu không chỉ rõ.
- `temperature: 0` kết hợp với `responseMimeType: 'application/json'` là cặp bắt buộc để output ổn định.
- Rule `never guess or infer` quan trọng với dữ liệu y tế — thà để trống còn hơn điền sai.
- Với mã BHYT: nhắc rõ "may be split across multiple lines" vì layout thẻ BHYT thường chia mã thành nhiều ô.
