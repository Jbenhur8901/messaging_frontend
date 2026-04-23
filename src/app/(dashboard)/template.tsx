"use client"

import { motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"

const ease = [0.16, 1, 0.3, 1] as const

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className="min-w-0">{children}</div>
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="min-w-0 will-change-[opacity,transform]"
    >
      {children}
    </motion.div>
  )
}
