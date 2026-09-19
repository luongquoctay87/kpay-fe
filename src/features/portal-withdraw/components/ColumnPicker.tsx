"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  PORTAL_WITHDRAW_COLUMNS,
  PORTAL_WITHDRAW_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  defaultColumnVisibility,
  visibleColumnCount,
} from "@/features/portal-withdraw/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={PORTAL_WITHDRAW_COLUMNS}
      labels={PORTAL_WITHDRAW_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="withdraw.columns"
      hintLabelKey="withdraw.columnsHint"
      allLabelKey="withdraw.columnsAll"
      defaultVisibility={defaultColumnVisibility}
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
