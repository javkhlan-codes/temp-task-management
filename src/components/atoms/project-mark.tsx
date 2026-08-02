import { cn } from "@/lib/utils";

const FALLBACK_PROJECT_COLOR = "var(--brand)";

export function ProjectMark({
  color,
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-[9px] shrink-0 rounded-[3px]", className)}
      style={{ backgroundColor: color ?? FALLBACK_PROJECT_COLOR }}
      aria-hidden="true"
    />
  );
}
