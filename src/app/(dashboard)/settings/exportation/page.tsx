import { redirect } from "next/navigation"

export default function ExportationRedirect() {
  redirect("/settings?tab=exportation")
}
