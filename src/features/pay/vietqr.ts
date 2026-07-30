/**
 * Build VietQR (EMVCo) payload for NAPAS bank transfer QR.
 * Spec: VietQR / NAPAS consumer-presented QR.
 */

/** Same string embedded in QR addInfo — use for UI + clipboard so they never diverge. */
export function sanitizeTransferContent(raw: string | undefined | null): string {
  if (!raw) return "";
  // NAPAS addInfo: alphanumeric-ish; keep common transfer chars; max 25 for QR field safety
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 \-_./]/g, "")
    .trim()
    .slice(0, 25);
}

export function buildVietQrPayload(input: {
  bankBin: string;
  accountNumber: string;
  amount: number;
  transferContent: string;
}): string | null {
  const bin = input.bankBin?.trim();
  const account = input.accountNumber?.trim();
  if (!bin || !account || !input.amount || input.amount <= 0) {
    return null;
  }

  const amountStr = String(Math.floor(input.amount));
  const addInfo = sanitizeTransferContent(input.transferContent);

  const consumer = tlv("00", bin) + tlv("01", account);
  const merchantAccountInfo =
    tlv("00", "A000000727") + tlv("01", consumer) + tlv("02", "QRIBFTTA");

  let payload =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("38", merchantAccountInfo) +
    tlv("53", "704") +
    tlv("54", amountStr) +
    tlv("58", "VN");

  if (addInfo) {
    payload += tlv("62", tlv("08", addInfo));
  }

  payload += "6304";
  const crc = crc16Ccitt(payload);
  return payload + crc;
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return id + len + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF). */
function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
