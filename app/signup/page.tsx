import type { Metadata } from "next";

import { SignupForm } from "@/components/pages/signup/signupForm";

export const metadata: Metadata = {
  title: "ثبت‌نام | دوتامیت",
  description: "با ساخت حساب رایگان در دوتامیت به لابی‌های فعال Dota 2 ملحق شو.",
};

export default function SignupPage() {
  return <SignupForm />;
}
