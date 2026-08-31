import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/pages/resetPassword/resetPasswordForm";

export const metadata: Metadata = {
  title: "بازیابی رمز عبور | دوتامیت",
  description: "رمز عبور حساب دوتامیت خودت رو بازیابی یا تغییر بده.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
