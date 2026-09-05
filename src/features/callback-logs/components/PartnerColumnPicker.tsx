"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  PARTNER_CALLBACK_LOG_COLUMNS,
  PARTNER_CALLBACK_LOG_COLUMN_LABEL_KEY,
  type PartnerColumnVisibility,
  defaultPartnerColumnVisibility,
  visiblePartnerColumnCount,
} from "@/features/callback-logs/partner-columns";

type PartnerColumnPickerProps = {
  visibility: PartnerColumnVisibility;
  onChange: (next: PartnerColumnVisibility) => void;
};

export function PartnerColumnPicker({
  visibility,
  onChange,
}: PartnerColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={PARTNER_CALLBACK_LOG_COLUMNS}
      labels={PARTNER_CALLBACK_LOG_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="callbackLogs.columns"
      hintLabelKey="callbackLogs.columnsHint"
      allLabelKey="callbackLogs.columnsAll"
      defaultVisibility={defaultPartnerColumnVisibility}
      reservedColumnCount={0}
      visibleCount={visiblePartnerColumnCount}
    />
  );
}
