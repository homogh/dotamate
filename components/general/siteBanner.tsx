"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function SiteBanner() {
  const [banner, setBanner] = useState<{ text: string; active: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/settings/banner", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success" && json.data.active && json.data.text) setBanner(json.data);
      })
      .catch(() => {});
  }, []);

  if (!banner) return null;

  return (
    <div className="flex w-full items-center justify-center gap-2 border-b border-[#f59e0b] bg-[#f59e0b]/[0.13] px-6 py-2.5 text-center" dir="auto">
      <AlertTriangle size={16} className="shrink-0 text-[#f59e0b]" />
      <p className="text-[13px] text-[#f59e0b]">{banner.text}</p>
    </div>
  );
}
