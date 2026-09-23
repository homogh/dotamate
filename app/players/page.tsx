import type { Metadata } from "next";

import { PlayersContent } from "@/components/pages/players/playersContent";

export const metadata: Metadata = {
  title: "پلیرها | دوتامیت",
  description: "همه بازیکنان دوتامیت با وضعیت آنلاین، رنک، پوزیشن و Behavior — پیداشون کن، بهشون پیام بده، دوست شو و به لابیت دعوتشون کن.",
};

export default function PlayersPage() {
  return <PlayersContent />;
}
