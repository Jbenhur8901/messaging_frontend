"use client"

import { useLayoutEffect } from "react"

const METAMASK_EXTENSION_ID = "nkbihfbeogaeaoehlefnkodbefgpgknn"

function isMetaMaskExtensionNoise(reason: unknown, filename?: string): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : String(reason ?? "")

  const stack = reason instanceof Error ? (reason.stack ?? "") : ""
  const source = `${filename ?? ""} ${stack}`

  return (
    /metamask/i.test(message) ||
    /failed to connect to metamask/i.test(message) ||
    source.includes(METAMASK_EXTENSION_ID) ||
    source.includes(`chrome-extension://${METAMASK_EXTENSION_ID}`)
  )
}

export function ExtensionErrorGuard() {
  useLayoutEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isMetaMaskExtensionNoise(event.reason)) {
        event.preventDefault()
      }
    }

    const onError = (event: ErrorEvent) => {
      if (isMetaMaskExtensionNoise(event.error ?? event.message, event.filename)) {
        event.preventDefault()
      }
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection)
    window.addEventListener("error", onError, true)

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
      window.removeEventListener("error", onError, true)
    }
  }, [])

  return null
}
