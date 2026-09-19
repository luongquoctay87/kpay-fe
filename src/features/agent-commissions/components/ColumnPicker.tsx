"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  AGENT_COMMISSION_COLUMNS,
  AGENT_COMMISSION_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  defaultColumnVisibility,
  visibleColumnCount,
} from "@/features/agent-commissions/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={AGENT_COMMISSION_COLUMNS}
      labels={AGENT_COMMISSION_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="agentPortal.columns"
      hintLabelKey="agentPortal.columnsHint"
      allLabelKey="agentPortal.columnsAll"
      defaultVisibility={defaultColumnVisibility}
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
