"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  PORTAL_PAYOUT_COLUMNS,
  PORTAL_PAYOUT_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  defaultColumnVisibility,
  visibleColumnCount,
} from "@/features/portal-payout/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={PORTAL_PAYOUT_COLUMNS}
      labels={PORTAL_PAYOUT_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="payout.columns"
      hintLabelKey="payout.columnsHint"
      allLabelKey="payout.columnsAll"
      defaultVisibility={defaultColumnVisibility}
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
