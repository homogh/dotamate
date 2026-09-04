"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, ShieldCheck, LogOut, User } from "lucide-react";

import { useAuth } from "@/app/stores/useAuth";
import { UserAvatar } from "@/components/general/userAvatar";

export function AccountMenu({ size = 36 }: { size?: number }) {
  const { user, role, fetchRole, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchRole();
  }, [user, fetchRole]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
        aria-label="منوی حساب کاربری"
      >
        <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} size={size} round />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-60 rounded-[10px] border border-border bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-end gap-0.5 px-3 py-2.5">
            <p className="text-[13px] font-bold text-text" dir="auto">
              {user.displayName}
            </p>
            {role && (
              <p className="text-[11px] text-accent" dir="auto">
                {role.roleName}
              </p>
            )}
          </div>
          <div className="h-px w-full bg-border" />

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] text-text hover:bg-white/5"
            dir="auto"
          >
            <LayoutGrid size={16} className="text-text-dim" />
            پنل کلاینت
          </Link>

          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] text-text hover:bg-white/5"
            dir="auto"
          >
            <User size={16} className="text-text-dim" />
            پروفایل من
          </Link>

          {role && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] text-text hover:bg-white/5"
              dir="auto"
            >
              <ShieldCheck size={16} className="text-danger" />
              پنل ادمین
            </Link>
          )}

          <div className="my-1 h-px w-full bg-border" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[13px] text-red-400 hover:bg-white/5"
            dir="auto"
          >
            <LogOut size={16} />
            خروج از حساب
          </button>
        </div>
      )}
    </div>
  );
}
