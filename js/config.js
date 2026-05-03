// Gemini 2.5 Flash on Vertex AI
export const GEMINI_MODEL  = 'gemini-2.5-flash';
export const GEMINI_REGION = 'us-central1';

export const CCCD_PROMPT = `You are an expert document analysis assistant specializing in Vietnamese identity documents. Extract structured data from the provided Vietnamese Citizen Identity Card image(s) (Căn cước công dân - CCCD, or Chứng minh nhân dân - CMND).

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
- If back side is present, extract issued and extra from it`;

export const BHYT_PROMPT = `You are an expert document analysis assistant specializing in Vietnamese health insurance documents. Extract structured data from the provided Vietnamese Health Insurance Card image (Thẻ Bảo hiểm y tế - BHYT).

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
- Do not merge unrelated numbers into the insurance code`;

// Field mapping: parser output key -> DOM element ID (CCCD form)
export const FIELD_MAP = {
  id:          'f_id',
  name:        'f_name',
  dob:         'f_dob',
  gender:      'f_gender',
  nationality: 'f_nationality',
  ethnicity:   'f_ethnicity',
  hometown:    'f_hometown',
  address:     'f_address',
  expiry:      'f_expiry',
  issued:      'f_issued',
  extra:       'f_extra',
};

// Field mapping: parser output key -> DOM element ID (BHYT form)
export const BHYT_FIELD_MAP = {
  id:         'b_id',
  name:       'b_name',
  dob:        'b_dob',
  gender:     'b_gender',
  address:    'b_address',
  kcb:        'b_kcb',
  kcb_code:   'b_kcb_code',
  valid_from: 'b_valid_from',
  five_year:  'b_5year',
};

