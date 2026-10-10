"use client";

import { useVersionCheck } from "@/hooks/useVersionCheck";

export default function VersionWatcher() {
  useVersionCheck();
  return null;
}

