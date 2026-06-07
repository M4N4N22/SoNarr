import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function SonarrLogo({
  href = "/",
  showWordmark = true,
  size = "md",
  className,
}: {
  href?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = {
    sm: { box: "h-7 w-7", image: 24, text: "text-sm" },
    md: { box: "h-8 w-8", image: 28, text: "text-sm" },
    lg: { box: "h-9 w-9", image: 32, text: "text-base" },
  }[size];

  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="SoNarr home">
      <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden", dimensions.box)}>
      </span>
      {showWordmark ? (
        <span className={cn("font-semibold tracking-tight text-foreground", dimensions.text)}>SoNarr</span>
      ) : null}
    </Link>
  );
}
