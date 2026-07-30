import type { ReactNode } from "react";

type FilterFieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
};

/** Label + control row for advanced filter grids (payin / payout). */
export function FilterField({ label, htmlFor, children }: FilterFieldProps) {
  return (
    <div className="grid min-w-0 grid-cols-[9.25rem_minmax(0,1fr)] items-center gap-x-2.5">
      <label
        htmlFor={htmlFor}
        title={label}
        className="truncate text-right text-label leading-none text-muted"
      >
        {label}&nbsp;:
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Shared Input/Select height + border for filter bars. */
export const filterControlClass =
  "!h-9 !border-edge bg-surface/80 hover:!border-edge-strong";

/** Native datetime-local sizing so 4-col grids don’t overflow. */
export const dateTimeControlClass = `${filterControlClass} min-w-0 max-w-full text-[13px] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:opacity-55 [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0`;
