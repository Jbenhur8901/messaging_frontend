import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    await request.json()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 })
  }
}
