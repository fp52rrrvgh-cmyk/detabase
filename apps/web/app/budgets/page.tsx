// DEPRECATED: redirects to /settings
import { redirect } from "next/navigation";

export default function BudgetsPage() {
  redirect("/settings");
}
