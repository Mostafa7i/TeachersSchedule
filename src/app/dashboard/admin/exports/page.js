"use client";

import { redirect } from "next/navigation";

export default function AdminExportsPage() {
  redirect("/dashboard/admin/schedules");
}
