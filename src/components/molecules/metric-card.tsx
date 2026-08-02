import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const iconToneClasses = {
  violet: "bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] text-brand",
  blue: "bg-[rgba(61,142,239,0.12)] text-[#438cee]",
  orange: "bg-[rgba(237,154,44,0.13)] text-[#e4962f]",
};

const glowToneClasses = {
  violet: "bg-brand",
  blue: "bg-info",
  orange: "bg-warning",
};

export function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: keyof typeof iconToneClasses;
  progress?: number;
}) {
  return (
    <Card className="relative flex min-h-[98px] flex-row items-center gap-0 overflow-hidden rounded-[13px] border border-border bg-surface px-[19px] py-[17px] ring-0 shadow-none max-tablet:min-w-[180px] max-nav:min-h-[86px] max-nav:min-w-[155px] max-nav:p-3.5">
      <div
        className={cn(
          "mr-[13px] flex size-[38px] shrink-0 items-center justify-center rounded-[10px] max-nav:mr-[9px] max-nav:size-[33px]",
          iconToneClasses[tone],
        )}
      >
        {icon}
      </div>
      <div className="grid w-full min-w-0 grid-cols-[1fr_auto]">
        <span className="col-start-1 mb-0.5 text-[10px] text-muted-foreground">
          {label}
        </span>
        <strong className="col-start-1 font-heading text-[23px] tracking-[-0.7px] max-nav:text-[19px]">
          {value}
        </strong>
        <small className="col-start-2 row-start-2 mt-2 whitespace-nowrap text-[9px] text-muted-foreground max-shell:hidden">
          {detail}
        </small>
      </div>
      {progress !== undefined && (
        <div className="absolute right-5 bottom-[13px] left-[70px] h-[3px] overflow-hidden rounded-[3px] bg-surface-hover max-nav:left-14">
          <span
            className="block h-full rounded-[inherit] bg-[linear-gradient(90deg,var(--brand),var(--brand-highlight))]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div
        className={cn(
          "absolute -top-[25px] -right-5 size-[55px] rounded-full opacity-[0.12] blur-[22px]",
          glowToneClasses[tone],
        )}
      />
    </Card>
  );
}
