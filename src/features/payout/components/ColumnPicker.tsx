"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  PAYOUT_COLUMNS,
  PAYOUT_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/payout/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={PAYOUT_COLUMNS}
      labels={PAYOUT_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="payout.columns"
      hintLabelKey="payout.columnsHint"
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
