import { cva, type VariantProps } from "class-variance-authority";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import type { WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const userAvatarVariants = cva(
  "size-full border-2 border-surface text-[10px] font-bold tracking-[-0.25px] text-white",
  {
    variants: {
      tone: {
        violet: "bg-[linear-gradient(145deg,#9b75ff,#6a47d8)]",
        cyan: "bg-[linear-gradient(145deg,#27c9ce,#1689a6)]",
        amber: "bg-[linear-gradient(145deg,#f9bd54,#dc7137)]",
        rose: "bg-[linear-gradient(145deg,#ff829e,#b73c69)]",
        slate: "bg-[linear-gradient(145deg,#8e95a7,#555c6d)]",
      },
      size: {
        default: "",
        sm: "border-[1.5px] text-[8px]",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      tone: "slate",
      size: "default",
    },
  },
);

export function UserAvatar({
  user,
  size,
  className,
  title = user.name,
}: {
  user: Pick<WorkspaceUser, "initials" | "name" | "tone">;
  className?: string;
  title?: string;
} & VariantProps<typeof userAvatarVariants>) {
  const tone =
    user.tone === "violet" ||
    user.tone === "cyan" ||
    user.tone === "amber" ||
    user.tone === "rose" ||
    user.tone === "slate"
      ? user.tone
      : "slate";

  return (
    <Avatar
      className={cn(
        "after:hidden",
        size === "sm" && "size-[27px]",
        size === "md" && "size-[30px]",
        size === "lg" && "size-9",
        (!size || size === "default") && "size-[34px]",
        className,
      )}
      title={title}
      aria-label={user.name}
    >
      <AvatarFallback className={userAvatarVariants({ tone, size })}>
        {user.initials}
      </AvatarFallback>
    </Avatar>
  );
}

export { userAvatarVariants };
