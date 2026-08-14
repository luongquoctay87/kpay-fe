"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  CUSTOMER_LEDGER_COLUMNS,
  CUSTOMER_LEDGER_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/customer-ledger/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={CUSTOMER_LEDGER_COLUMNS}
      labels={CUSTOMER_LEDGER_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="customerLedger.columns"
      hintLabelKey="customerLedger.columnsHint"
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
