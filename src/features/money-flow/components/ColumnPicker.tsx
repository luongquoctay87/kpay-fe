"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  MONEY_FLOW_COLUMNS,
  MONEY_FLOW_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  visibleColumnCount,
} from "@/features/money-flow/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={MONEY_FLOW_COLUMNS}
      labels={MONEY_FLOW_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="moneyFlow.columns"
      hintLabelKey="moneyFlow.columnsHint"
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
