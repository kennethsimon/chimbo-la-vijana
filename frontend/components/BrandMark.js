import Image from "next/image";
import { cn } from "../lib/utils";

export function BrandMark({ compact = false }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md border bg-card shadow-sm", compact ? "size-11" : "size-14")}>
      <Image
        src="/chimbo-logo.png"
        alt="Chimbo La Vijana Brunch"
        width={compact ? 38 : 50}
        height={compact ? 38 : 50}
        className="rounded-sm object-contain"
        priority
      />
    </span>
  );
}
