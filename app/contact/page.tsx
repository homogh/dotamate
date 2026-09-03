import type { Metadata } from "next";
import { Clock, MessageCircle, Send, Mail } from "lucide-react";

import { PageBanner } from "@/components/general/pageBanner";
import { RevealGroup } from "@/components/general/revealGroup";
import { TicketDesk } from "@/components/pages/contact/ticketDesk";

export const metadata: Metadata = {
  title: "ارتباط با پشتیبانی | دوتامیت",
  description: "سوالی دارید یا به مشکل خورده‌اید؟ تیم دوتامیت در تمام روزهای هفته آماده پاسخ‌گویی است.",
};

const CHANNELS = [
  {
    icon: Clock,
    tone: "bg-[rgba(34,197,94,0.14)] text-[#22c55e]",
    title: "زمان پاسخ‌دهی",
    value: "حداکثر ۲۴ ساعت کاری",
  },
  {
    icon: MessageCircle,
    tone: "bg-[rgba(88,101,242,0.1)] text-[#5865f2]",
    title: "دیسکورد رسمی",
    value: "discord.gg/dotamate",
  },
  {
    icon: Send,
    tone: "bg-[rgba(36,161,222,0.1)] text-[#24a1de]",
    title: "کانال تلگرام",
    value: "t.me/dotamate",
  },
  {
    icon: Mail,
    tone: "bg-[rgba(61,60,206,0.1)] text-accent",
    title: "ایمیل پشتیبانی",
    value: "support@dotamate.ir",
  },
];

export default function ContactPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <PageBanner
        title="ارتباط با پشتیبانی دوتامیت"
        subtitle="سوالی دارید یا به مشکل خورده‌اید؟ تیم دوتامیت در تمام روزهای هفته آماده پاسخ‌گویی و کمک به شماست."
      >
        <RevealGroup className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c) => (
            <div
              key={c.title}
              className="flex flex-col items-end gap-4 rounded-[12px] border border-border bg-surface-alt p-6 text-right"
            >
              <div className={`flex size-12 items-center justify-center rounded-[8px] ${c.tone}`}>
                <c.icon size={22} />
              </div>
              <p className="w-full text-lg font-black text-text" dir="auto">
                {c.title}
              </p>
              <p className="w-full text-sm text-text-dim" dir="ltr">
                {c.value}
              </p>
            </div>
          ))}
        </RevealGroup>
      </PageBanner>

      <div className="w-full px-6 py-14 md:px-[100px]">
        <TicketDesk />
      </div>
    </div>
  );
}
