import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <span className="text-2xl font-bold text-gray-400">404</span>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Page introuvable
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          La page que vous recherchez n&apos;existe pas ou a &eacute;t&eacute; d&eacute;plac&eacute;e.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Retour au dashboard
      </Link>
    </div>
  )
}
