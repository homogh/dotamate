import type { Metadata } from "next";
import { Suspense } from "react";

import { SteamConnect } from "@/components/pages/signup/steamConnect";

export const metadata: Metadata = {
  title: "اتصال استیم | دوتامیت",
  description: "پروفایل استیمت رو وصل کن تا دوتامیت از روی رزومه‌ی واقعی بازی‌هات هم‌تیمی پیدا کنه.",
};

export default function SignupSteamPage() {
  return (
    <Suspense>
      <SteamConnect />
    </Suspense>
  );
}
