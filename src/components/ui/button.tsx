import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("shadcn-button", {
  variants: {
    variant: {
      default: "shadcn-button-default",
      destructive: "shadcn-button-destructive",
      outline: "shadcn-button-outline",
      secondary: "shadcn-button-secondary",
      ghost: "shadcn-button-ghost",
      link: "shadcn-button-link",
    },
    size: {
      default: "shadcn-button-size-default",
      sm: "shadcn-button-size-sm",
      lg: "shadcn-button-size-lg",
      icon: "shadcn-button-size-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
