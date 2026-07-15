import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const createNonce = () => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  let binary = ""
  for (const byte of array) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — no auth needed
  const publicRoutes = ["/auth/", "/terms", "/invite/", "/flow"]
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))

  // Static files in /public (e.g. /rr.jpg) should never require auth.
  // Next serves them at the root path and they can be requested by <Image />.
  const isPublicAsset =
    pathname.includes(".") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")

  const isPublic = isPublicRoute || isPublicAsset

  if (!isPublic && pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("admin_token")?.value
    if (!adminToken && !pathname.startsWith("/admin/login")) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
  }

  const nonce = createNonce()
  const isDev = process.env.NODE_ENV !== "production"

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: http: ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    !isDev ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
}
