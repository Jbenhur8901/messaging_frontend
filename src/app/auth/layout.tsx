import { Send } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Send className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">Flow</span>
      </div>
      {children}
    </div>
  )
}
