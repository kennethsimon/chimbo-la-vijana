import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-transparent bg-secondary text-secondary-foreground",
        ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warn: "border-amber-200 bg-amber-50 text-amber-700",
        err: "border-red-200 bg-red-50 text-red-700"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

export function Badge({ tone, className, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
