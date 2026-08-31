import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/header/navbar";
import { Footer } from "@/components/footer/footer";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "دوتامیت | پیدا کردن هم‌تیمی Dota 2",
  description:
    "دوتامیت پلتفرمی بومی و ایرانی برای پیدا کردن هم‌تیمی در Dota 2 است. بازیکنان باانگیزه و متناسب با رنک خودت رو پیدا کن، وارد پارتی شو و هماهنگ صعود کن.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" className={`${vazirmatn.variable} antialiased`}>
      <body className="flex min-h-screen flex-col bg-bg">
        <Navbar />
        <main className="flex flex-1 flex-col items-center">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
