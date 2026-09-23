"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ProductEditor } from "@/components/pages/admin/productEditor";

export default function NewShopProductPage() {
  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Link href="/admin/shop/products" className="flex items-center gap-1 text-[13px] text-text-dim hover:text-text" dir="auto">
        <ChevronLeft size={14} />
        بازگشت به لیست محصولات
      </Link>
      <p className="w-full text-right text-[20px] font-black text-text" dir="auto">
        افزودن محصول جدید
      </p>
      <ProductEditor />
    </div>
  );
}
