"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/general/accountMenu";
import { NotificationBell } from "@/components/general/notificationBell";
import { useAuth } from "@/app/stores/useAuth";

const NAV_ITEMS: { label: string; href: string; requiresShop?: boolean }[] = [
  { label: "صفحه اصلی", href: "/" },
  { label: "جستجوی لابی", href: "/search-lobby" },
  { label: "پلیرها", href: "/players" },
  { label: "متا", href: "/meta" },
  { label: "فروشگاه", href: "/shop", requiresShop: true },
  { label: "وبلاگ", href: "/blog" },
  { label: "سوالات متداول", href: "/faq" },
  { label: "قوانین و مقررات", href: "/terms" },
];

/** Section links stay highlighted on their sub-pages too (e.g. /shop/12 → «فروشگاه»). */
function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shopEnabled, setShopEnabled] = useState(false);
  const { user, status, fetchMe } = useAuth();
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  useEffect(() => {
    // Fetches even on dashboard routes (where Navbar itself renders null)
    // so the shared useAuth store is populated for AccountMenu there too.
    if (status === "idle") fetchMe();
  }, [status, fetchMe]);

  useEffect(() => {
    fetch("/api/settings/shop", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setShopEnabled(json.data.enabled);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function closeOnDesktop() {
      if (window.innerWidth >= 1024) setOpen(false);
    }
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (isDashboard) return null;

  const navItems = NAV_ITEMS.filter((item) => !item.requiresShop || shopEnabled);

  return (
    <header className="sticky top-0 z-50 flex w-full flex-col border-b border-border bg-bg-alt">
      <div className="flex h-[80px] w-full items-center justify-between px-6 md:px-[100px]">
        <Link href="/" className="flex items-center gap-3">
          <p className="text-[22px] font-black text-text" dir="auto">
            دوتامیت
          </p>
          <div className="flex size-10 items-center justify-center rounded-[8px] bg-primary">
            <Image
              src="/images/landing/shield-check.svg"
              alt=""
              width={24}
              height={24}
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold lg:flex xl:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(pathname, item.href)
                  ? "text-text"
                  : "text-text-dim transition-colors hover:text-text"
              }
              dir="auto"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {status === "authenticated" && user ? (
            <>
              <NotificationBell align="left" />
              <AccountMenu size={32} label={user.displayName} align="left" />
            </>
          ) : (
            <>
              <Button asChild size="sm">
                <Link href="/signup">ثبت‌نام رایگان</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">ورود به حساب</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-[8px] border border-border text-text lg:hidden"
          aria-label={open ? "بستن منو" : "باز کردن منو"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <MobileMenu
          pathname={pathname}
          navItems={navItems}
          onNavigate={() => setOpen(false)}
          user={user}
          status={status}
        />
      )}
    </header>
  );
}

function MobileMenu({
  pathname,
  navItems,
  onNavigate,
  user,
  status,
}: {
  pathname: string;
  navItems: typeof NAV_ITEMS;
  onNavigate: () => void;
  user: ReturnType<typeof useAuth.getState>["user"];
  status: ReturnType<typeof useAuth.getState>["status"];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(ref.current, {
        autoAlpha: 0,
        y: -12,
        duration: 0.3,
        ease: "power2.out",
      });
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className="flex w-full flex-col gap-6 border-t border-border bg-bg-alt px-6 py-6 lg:hidden"
    >
      <nav className="flex flex-col items-start gap-4 text-sm font-bold">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={isActive(pathname, item.href) ? "text-text" : "text-text-dim"}
            dir="auto"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col items-stretch gap-3">
        {status === "authenticated" && user ? (
          <Button asChild size="sm">
            <Link href="/dashboard" onClick={onNavigate}>
              رفتن به داشبورد
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild size="sm">
              <Link href="/signup" onClick={onNavigate}>
                ثبت‌نام رایگان
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/login" onClick={onNavigate}>
                ورود به حساب
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
