import Image from "next/image"
import { cn } from "@/lib/utils"

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
  return (
    <div
      className={cn("flex items-center justify-center overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-nodes.png"
        alt="Flow"
        width={size}
        height={size}
        priority={priority}
        className={cn("h-full w-full object-contain brightness-0 invert", imageClassName)}
      />
    </div>
  )
}
