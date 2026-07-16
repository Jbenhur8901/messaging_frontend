import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const target = new URL(`/r/${encodeURIComponent(token)}`, apiBaseUrl)
  return NextResponse.redirect(target, 307)
}
