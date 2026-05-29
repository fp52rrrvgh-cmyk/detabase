// DEPRECATED: redirects to /settings
import { redirect } from "next/navigation";

export default function SubscriptionsPage() {
  redirect("/settings");
}
