import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const brandLogoVariants = cva(
  "inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent [&_img]:block [&_img]:size-full [&_img]:scale-[1.58] [&_img]:object-contain",
  {
    variants: {
      size: {
        default: "size-[31px]",
        auth: "size-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export function BrandLogo({
  className,
  size,
}: { className?: string } & VariantProps<typeof brandLogoVariants>) {
  return (
    <span
      className={cn(brandLogoVariants({ size }), className)}
      aria-hidden="true"
    >
      <img src="/pro-team-logo.png" alt="" />
    </span>
  );
}
