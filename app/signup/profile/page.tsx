import type { Metadata } from "next";

import { ProfileSetup } from "@/components/pages/signup/profileSetup";

export const metadata: Metadata = {
  title: "تکمیل پروفایل | دوتامیت",
  description: "رنک و پز اصلیت رو انتخاب کن تا پروفایلت آماده بشه.",
};

export default function SignupProfilePage() {
  return <ProfileSetup />;
}
