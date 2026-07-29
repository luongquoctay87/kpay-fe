/** Đủ để bắt lỗi gõ sai; định dạng cuối cùng vẫn do BE (@Email) quyết định. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Ký tự trang trí thường gặp khi gõ số điện thoại. */
const PHONE_SEPARATORS = /[\s.\-()]/g;

/** Khớp với @Size của BE để không bị 400 vì quá dài. */
export const EMAIL_MAX_LENGTH = 255;
export const PHONE_MAX_LENGTH = 32;
export const TELEGRAM_ID_MAX_LENGTH = 64;

export function isEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(trimmed);
}

/**
 * Chấp nhận cả dạng nội địa (0912345678) và quốc tế (+84 912 345 678):
 * bỏ dấu cách/gạch/ngoặc rồi yêu cầu 8–15 chữ số, tuỳ chọn dấu + ở đầu.
 */
export function isPhone(value: string): boolean {
  const digits = value.trim().replace(PHONE_SEPARATORS, "");
  return /^\+?\d{8,15}$/.test(digits);
}
