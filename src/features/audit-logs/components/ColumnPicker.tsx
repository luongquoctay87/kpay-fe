"use client";

import { ColumnPicker as SharedColumnPicker } from "@/components/common/ColumnPicker";
import {
  AUDIT_LOG_COLUMNS,
  AUDIT_LOG_COLUMN_LABEL_KEY,
  type ColumnVisibility,
  defaultColumnVisibility,
  visibleColumnCount,
} from "@/features/audit-logs/columns";

type ColumnPickerProps = {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
};

export function ColumnPicker({ visibility, onChange }: ColumnPickerProps) {
  return (
    <SharedColumnPicker
      columns={AUDIT_LOG_COLUMNS}
      labels={AUDIT_LOG_COLUMN_LABEL_KEY}
      visibility={visibility}
      onChange={onChange}
      buttonLabelKey="auditLogs.columns"
      hintLabelKey="auditLogs.columnsHint"
      allLabelKey="auditLogs.columnsAll"
      defaultVisibility={defaultColumnVisibility}
      reservedColumnCount={1}
      visibleCount={visibleColumnCount}
    />
  );
}
