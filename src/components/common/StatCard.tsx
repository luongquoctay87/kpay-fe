type StatCardTone = "default" | "success" | "info" | "warning" | "danger";

type StatCardProps = {
  label: string;
  value: string;
  tone?: StatCardTone;
};

const BAR: Record<StatCardTone, string> = {
  default: "bg-ink/35",
  success: "bg-success",
  info: "bg-ink-secondary",
  warning: "bg-warning",
  danger: "bg-danger",
};

const VALUE: Record<StatCardTone, string> = {
  default: "text-ink",
  success: "text-success",
  info: "text-ink-secondary",
  warning: "text-warning",
  danger: "text-danger",
};

/** Compact KPI tile used on payin / payout list headers. */
export function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <div className="relative flex h-full min-h-[76px] min-w-0 flex-col justify-center overflow-hidden rounded-lg border border-edge bg-elevated py-3 pl-4 pr-3 sm:pl-5 sm:pr-4">
      <span className={`absolute inset-y-0 left-0 w-0.5 ${BAR[tone]}`} aria-hidden />
      <p className="break-words text-caption text-muted">{label}</p>
      <p
        className={`mt-1.5 break-all text-lg font-semibold leading-none tabular-nums tracking-tight sm:text-xl ${VALUE[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}
