// Redirect to schedules page where weeks management is now integrated
import { redirect } from "next/navigation";

export default function AdminWeeksPage() {
  redirect("/dashboard/admin/schedules");
}
