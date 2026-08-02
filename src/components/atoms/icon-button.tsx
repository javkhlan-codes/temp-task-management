import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IconButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-[38px] rounded-[9px] border border-transparent text-muted-foreground hover:border-border hover:bg-surface-hover hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
