"use client";

import { cn } from "@/lib/cn";

type HintTooltipProps = {
  text: string;
  className?: string;
};

/** Compact “i” affordance — shows hint on hover/focus (for long field notes). */
export function HintTooltip({ text, className }: HintTooltipProps) {
  return (
    <span className={cn("group relative inline-flex shrink-0 align-middle", className)}>
      <button
        type="button"
        tabIndex={0}
        aria-label={text}
        onClick={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        className="inline-flex size-4 items-center justify-center rounded-full border border-edge-strong text-[10px] font-semibold leading-none text-muted transition hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-left text-caption font-normal leading-snug text-on-accent opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:max-w-[18rem]"
      >
        {text}
      </span>
    </span>
  );
}
