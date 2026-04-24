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
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-nodes.png"
        alt="Nodes"
        width={size}
        height={size}
        priority={priority}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </div>
  )
}
