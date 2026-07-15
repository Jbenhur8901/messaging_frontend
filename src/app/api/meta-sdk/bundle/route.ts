import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const META_SDK_BUNDLE_BASE = "https://connect.facebook.net/fr_FR/bundle/sdk.js/"

export async function GET(request: NextRequest) {
  // Transmettre les query params que Meta ajoute dynamiquement au bundle
  const queryString = request.nextUrl.search
  const META_SDK_BUNDLE_URL = `${META_SDK_BUNDLE_BASE}${queryString}`

  try {
    const response = await fetch(META_SDK_BUNDLE_URL, {
      headers: { "User-Agent": "Nodes-Flow-Meta-SDK-Proxy/1.0" },
      next: { revalidate: 1200 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bundle Meta SDK indisponible (${response.status})` },
        { status: 502 }
      )
    }

    return new NextResponse(await response.text(), {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=1200, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[Meta SDK Proxy] Échec du téléchargement du bundle", error)
    return NextResponse.json(
      { error: "Impossible de télécharger le bundle SDK Meta" },
      { status: 502 }
    )
  }
}
