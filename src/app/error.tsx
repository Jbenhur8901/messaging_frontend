"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <svg
          className="h-7 w-7 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Une erreur est survenue
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Quelque chose s&apos;est mal pass&eacute;. Veuillez r&eacute;essayer.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          R&eacute;essayer
        </button>
        <a
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Retour au dashboard
        </a>
      </div>
    </div>
  )
}
