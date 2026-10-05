import type { Metadata } from "next";
import { Wrench } from "lucide-react";

import { getPlatformSettings } from "@/app/lib/platformSettings";

export const metadata: Metadata = {
  title: "در دست تعمیر | دوتامیت",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const settings = await getPlatformSettings();

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <Wrench size={44} className="text-accent" />
      <h1 className="text-[28px] font-black text-text" dir="auto">
        دوتامیت در دست تعمیره
      </h1>
      <p className="max-w-[520px] text-[15px] leading-[1.9] text-text-dim" dir="auto">
        {settings.maintenanceMessage || "داریم سایت رو بهتر می‌کنیم. چند لحظه دیگه برگرد."}
      </p>
    </div>
  );
}
