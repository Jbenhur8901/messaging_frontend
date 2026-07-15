import { NextResponse } from "next/server"

const META_SDK_URL = "https://connect.facebook.net/fr_FR/sdk.js"

export async function GET() {
  try {
    const response = await fetch(META_SDK_URL, {
      headers: { "User-Agent": "Nodes-Flow-Meta-SDK-Proxy/1.0" },
      next: { revalidate: 1200 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Meta SDK indisponible (${response.status})` },
        { status: 502 }
      )
    }

    const bootstrap = (await response.text())
      .replaceAll(
        "https:\\/\\/connect.facebook.net\\/fr_FR\\/bundle\\/sdk.js\\/",
        "/api/meta-sdk/bundle"
      )
      .replaceAll(
        "https://connect.facebook.net/fr_FR/bundle/sdk.js/",
        "/api/meta-sdk/bundle"
      )

    return new NextResponse(bootstrap, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=1200, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[Meta SDK Proxy] Échec du téléchargement", error)
    return NextResponse.json(
      { error: "Impossible de télécharger le SDK Meta" },
      { status: 502 }
    )
  }
}
