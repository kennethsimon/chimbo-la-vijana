import Image from "next/image";
import { cn } from "../lib/utils";

export function BrandMark({ compact = false }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md border bg-card shadow-sm", compact ? "h-11 w-10" : "h-14 w-12")}>
      <Image
        src="/chimbo-logo.png"
        alt="Chimbo La Vijana Brunch"
        width={compact ? 34 : 46}
        height={compact ? 40 : 54}
        priority
      />
    </span>
  );
}
