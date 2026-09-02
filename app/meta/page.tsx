import type { Metadata } from "next";

import { MetaContent } from "@/components/pages/meta/metaContent";

export const metadata: Metadata = {
  title: "متای پچ فعلی | دوتامیت",
  description: "قوی‌ترین هیروهای هر پوزیشن در پچ فعلی Dota 2، بر اساس وین‌ریت و پیک‌ریت — قابل فیلتر بر اساس رنک و پوزیشن.",
};

export default function MetaPage() {
  return <MetaContent />;
}
