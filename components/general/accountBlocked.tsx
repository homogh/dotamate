"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AccountBlocked({ message }: { message: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <ShieldAlert size={44} className="text-danger" />
      <p className="max-w-[520px] text-[16px] font-bold leading-[1.9] text-text" dir="auto">
        {message}
      </p>
      <p className="text-[13px] text-text-dim" dir="auto">
        اگه فکر می‌کنی اشتباهی شده، از طریق صفحه تماس با پشتیبانی در ارتباط باش.
      </p>
      <Button variant="outline" size="sm" onClick={logout} disabled={busy}>
        خروج از حساب
      </Button>
    </div>
  );
}
