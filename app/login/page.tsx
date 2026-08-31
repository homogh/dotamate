import type { Metadata } from "next";

import { LoginForm } from "@/components/pages/login/loginForm";

export const metadata: Metadata = {
  title: "ورود | دوتامیت",
  description: "وارد حساب دوتامیت خودت شو و به لابی‌های فعال Dota 2 ملحق شو.",
};

export default function LoginPage() {
  return <LoginForm />;
}
