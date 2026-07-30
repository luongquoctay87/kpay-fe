"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  CALLBACK_LOG_COLUMNS,
  CALLBACK_LOG_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/callback-logs/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={CALLBACK_LOG_COLUMNS}
      labels={CALLBACK_LOG_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="callbackLogs.columns"
      hintLabelKey="callbackLogs.columnsHint"
      reservedColumnCount={0}
      visibleCount={visibleColumnCount}
    />
  );
}
