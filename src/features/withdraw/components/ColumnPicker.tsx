"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  WITHDRAW_COLUMNS,
  WITHDRAW_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/withdraw/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={WITHDRAW_COLUMNS}
      labels={WITHDRAW_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="withdraw.columns"
      hintLabelKey="withdraw.columnsHint"
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
