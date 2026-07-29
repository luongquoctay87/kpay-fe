"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";

type RequiredValues<K extends string> = Record<K, string | null | undefined>;

export type RequiredFields<K extends string> = {
  /** true khi còn field bắt buộc đang trống. */
  hasMissing: boolean;
  /** true sau khi submit bị chặn — dùng để hiện thêm lỗi riêng của form. */
  revealed: boolean;
  /** Hiện lỗi dưới các field còn trống — gọi khi submit bị chặn. */
  reveal: () => void;
  /** Ẩn lỗi trở lại, dùng khi reset form. */
  hide: () => void;
  /** Message cho `Field.error`; undefined khi field hợp lệ hoặc chưa submit. */
  errorOf: (key: K) => string | undefined;
};

/**
 * Validate field bắt buộc bằng UI của app thay vì bubble mặc định của trình
 * duyệt ("Please fill out this field") — bubble đó không style được và hiển thị
 * theo ngôn ngữ của trình duyệt chứ không theo locale đang chọn.
 *
 * Form dùng hook này cần thêm `noValidate` để tắt validation gốc. Lỗi chỉ hiện
 * sau lần submit thất bại đầu tiên và tự biến mất khi user nhập lại.
 *
 * Usage:
 *   const required = useRequiredFields({ name, username });
 *   // trong submit: if (required.hasMissing) { required.reveal(); return; }
 *   <Field error={required.errorOf("name")}>
 *     <Input invalid={Boolean(required.errorOf("name"))} … />
 *   </Field>
 */
export function useRequiredFields<K extends string>(
  values: RequiredValues<K>,
  options: { selectKeys?: readonly NoInfer<K>[] } = {},
): RequiredFields<K> {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(false);

  const keys = Object.keys(values) as K[];
  const missing = keys.filter((key) => !values[key]?.trim());

  const reveal = useCallback(() => setRevealed(true), []);
  const hide = useCallback(() => setRevealed(false), []);

  return {
    hasMissing: missing.length > 0,
    revealed,
    reveal,
    hide,
    errorOf: (key) => {
      if (!revealed || !missing.includes(key)) return undefined;
      return options.selectKeys?.includes(key)
        ? t("common.fieldRequiredSelect")
        : t("common.fieldRequired");
    },
  };
}
