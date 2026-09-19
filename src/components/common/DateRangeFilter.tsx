"use client";

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
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

/** Restore a date-range control from ISO bounds stored in the URL / API filters. */
export function isoBoundsToDateRange(
  from?: string | null,
  to?: string | null,
): DateRangeValue {
  if (!from && !to) return null;
  const start = from ? dayjs(from) : null;
  const end = to ? dayjs(to) : null;
  if ((start && !start.isValid()) || (end && !end.isValid())) return null;
  if (!start && !end) return null;
  return [start, end];
}

/** Today in the browser timezone — matches BE `defaultCreatedTodayIfUnset` for VN users. */
export function todayDateRange(): NonNullable<DateRangeValue> {
  const today = dayjs();
  return [today.startOf("day"), today.endOf("day")];
}

export function isTodayDateRange(range: DateRangeValue): boolean {
  if (!range?.[0] || !range?.[1]) return false;
  const today = dayjs();
  return range[0].isSame(today, "day") && range[1].isSame(today, "day");
}

/** Empty picker → today, so the UI matches BE `defaultCreatedTodayIfUnset`. */
export function dateRangeOrToday(range: DateRangeValue): DateRangeValue {
  if (range?.[0] || range?.[1]) return range;
  return todayDateRange();
}
