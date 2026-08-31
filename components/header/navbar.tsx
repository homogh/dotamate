"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "صفحه اصلی", href: "/" },
  { label: "جستجوی لابی", href: "/lobbies" },
  { label: "متا", href: "/meta" },
  { label: "وبلاگ", href: "/blog" },
  { label: "سوالات متداول", href: "/faq" },
  { label: "قوانین و مقررات", href: "/terms" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function closeOnDesktop() {
      if (window.innerWidth >= 768) setOpen(false);
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

  return (
    <header className="sticky top-0 z-50 flex w-full flex-col border-b border-border bg-bg-alt">
      <div className="flex h-[80px] w-full items-center justify-between px-6 md:px-[100px]">
        <div className="hidden items-center gap-4 md:flex">
          <Button asChild size="sm">
            <Link href="/signup">ثبت‌نام رایگان</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">ورود به حساب</Link>
          </Button>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-bold md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? "text-text"
                  : "text-text-dim transition-colors hover:text-text"
              }
              dir="auto"
            >
              {item.label}
            </Link>
          ))}
        </nav>

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

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-[8px] border border-border text-text md:hidden"
          aria-label={open ? "بستن منو" : "باز کردن منو"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && <MobileMenu pathname={pathname} onNavigate={() => setOpen(false)} />}
    </header>
  );
}

function MobileMenu({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
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
      className="flex w-full flex-col gap-6 border-t border-border bg-bg-alt px-6 py-6 md:hidden"
    >
      <nav className="flex flex-col items-start gap-4 text-sm font-bold">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={pathname === item.href ? "text-text" : "text-text-dim"}
            dir="auto"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col items-stretch gap-3">
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
      </div>
    </div>
  );
}
