"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  BANK_RECONCILIATION_COLUMNS,
  BANK_RECONCILIATION_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/bank-reconciliation/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={BANK_RECONCILIATION_COLUMNS}
      labels={BANK_RECONCILIATION_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="bankReconciliation.columns"
      hintLabelKey="bankReconciliation.columnsHint"
      reservedColumnCount={0}
      visibleCount={visibleColumnCount}
    />
  );
}
