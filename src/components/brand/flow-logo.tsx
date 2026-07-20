import Image from "next/image"
import { cn } from "@/lib/utils"

const LOGO_ASPECT = 1536 / 1024

interface FlowLogoProps {
  size?: number
  className?: string
  imageClassName?: string
  priority?: boolean
}

export function FlowLogo({
  size = 32,
  className,
  imageClassName,
  priority = false,
}: FlowLogoProps) {
  const height = size
  const width = Math.round(size * LOGO_ASPECT)

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      style={{ width, height, maxWidth: "100%" }}
    >
      <Image
        src="/logo_flow_blanc.png"
        alt="Flow"
        width={width}
        height={height}
        priority={priority}
        sizes={`${width}px`}
        className={cn("h-full w-full max-w-full object-contain object-left", imageClassName)}
      />
    </div>
  )
}
