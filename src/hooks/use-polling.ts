import { useEffect, useRef } from "react"

interface UsePollingOptions {
  interval: number
  enabled?: boolean
}

export function usePolling(callback: () => void, options: UsePollingOptions) {
  const { interval, enabled = true } = options
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      callbackRef.current()
    }, interval)

    return () => clearInterval(id)
  }, [interval, enabled])
}
