"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  PORTAL_BALANCE_COLUMNS,
  PORTAL_BALANCE_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  defaultColumnVisibility,
  visibleColumnCount,
} from "@/features/portal-balance/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={PORTAL_BALANCE_COLUMNS}
      labels={PORTAL_BALANCE_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="portal.columns"
      hintLabelKey="portal.columnsHint"
      allLabelKey="portal.columnsAll"
      defaultVisibility={defaultColumnVisibility}
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
