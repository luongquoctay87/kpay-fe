import type { ReactNode } from "react";

type FilterFieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
};

/**
 * Label-above control for advanced filter grids (payin / payout).
 * Stacked layout keeps columns aligned and gives inputs full cell width.
 */
export function FilterField({ label, htmlFor, children }: FilterFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-muted">
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Shared Input/Select height + border for filter bars. */
export const filterControlClass =
  "!h-9 w-full !border-edge bg-surface/80 hover:!border-edge-strong";

/** Native datetime-local sizing so multi-col grids don’t overflow. */
export const dateTimeControlClass = `${filterControlClass} min-w-0 max-w-full text-[13px] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:opacity-55 [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0`;
