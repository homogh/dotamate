import type { Metadata } from "next";

import { SearchLobbyContent } from "@/components/pages/searchLobby/searchLobbyContent";

export const metadata: Metadata = {
  title: "جستجوی لابی | دوتامیت",
  description: "لابی‌های فعال بازیکنان دوتا ۲ رو پیدا کن و با فیلتر رنک، پوزیشن و ریجن، دقیقاً هم‌تیمی که نیاز داری رو پیدا کن.",
};

export default function SearchLobbyPage() {
  return <SearchLobbyContent />;
}
