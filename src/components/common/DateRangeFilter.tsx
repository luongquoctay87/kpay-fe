"use client";

import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import { cn } from "@/lib/cn";
import { DATE_DISPLAY_FORMAT } from "@/lib/format/datetime";

export type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

type DateRangeFilterProps = {
  id?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: [string, string];
  className?: string;
  "aria-label"?: string;
};

function RangeSeparator() {
  return (
    <span className="kpay-date-range__sep" aria-hidden>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12h14" />
        <path d="m14 6 6 6-6 6" />
      </svg>
    </span>
  );
}

/** Single control for selecting a from–to calendar date range in filter bars. */
export function DateRangeFilter({
  id,
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: DateRangeFilterProps) {
  return (
    <DatePicker.RangePicker
      id={id}
      value={value}
      onChange={(dates) => onChange(dates ?? null)}
      allowClear
      format={DATE_DISPLAY_FORMAT}
      placeholder={placeholder}
      aria-label={ariaLabel}
      separator={<RangeSeparator />}
      className={cn("kpay-date-range", className)}
    />
  );
}

/** Convert local date range to inclusive ISO bounds for list API filters. */
export function dateRangeToIsoBounds(range: DateRangeValue): {
  from?: string;
  to?: string;
} {
  const from = range?.[0];
  const to = range?.[1];
  return {
    from: from ? from.startOf("day").toISOString() : undefined,
    to: to ? to.endOf("day").toISOString() : undefined,
  };
}
