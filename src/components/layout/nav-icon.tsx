import type { Icon } from "@phosphor-icons/react"

export function NavIcon({
  icon: IconComponent,
  active,
  className,
}: {
  icon: Icon
  active?: boolean
  className?: string
}) {
  return <IconComponent weight={active ? "fill" : "regular"} className={className} />
}
