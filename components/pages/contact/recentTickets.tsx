import { cn } from "@/app/lib/utils";
import { RECENT_TICKETS, STATUS_STYLES } from "@/app/lib/supportTickets";

export function RecentTickets() {
  return (
    <div className="w-full overflow-hidden rounded-[12px] border border-border">
      <div className="w-full overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid w-full grid-cols-[100px_1fr_180px_160px_150px_100px] gap-3 border-b border-border bg-bg-alt p-4 text-sm font-bold text-[rgba(255,255,255,0.5)]">
            <p className="text-center">شماره</p>
            <p className="text-right">موضوع تیکت</p>
            <p className="text-right">دسته‌بندی</p>
            <p className="text-center">وضعیت</p>
            <p className="text-right">تاریخ ثبت</p>
            <p className="text-center">عملیات</p>
          </div>

          {RECENT_TICKETS.map((ticket, i) => {
            const status = STATUS_STYLES[ticket.status];
            return (
              <div
                key={ticket.id}
                className={cn(
                  "grid w-full grid-cols-[100px_1fr_180px_160px_150px_100px] items-center gap-3 bg-surface-alt p-4",
                  i < RECENT_TICKETS.length - 1 && "border-b border-border"
                )}
              >
                <p className="text-center text-sm tabular-nums text-[rgba(255,255,255,0.5)]">
                  #{ticket.id}
                </p>
                <p className="truncate text-right text-sm font-bold text-text" dir="auto">
                  {ticket.subject}
                </p>
                <p className="text-right text-sm text-text-dim" dir="auto">
                  {ticket.category}
                </p>
                <div className="flex justify-center">
                  <span
                    className={cn(
                      "rounded-[4px] border px-3 py-1 text-xs font-bold whitespace-nowrap",
                      status.bg,
                      status.border,
                      status.text
                    )}
                    dir="auto"
                  >
                    {ticket.status}
                  </span>
                </div>
                <p className="text-right text-sm tabular-nums text-text-dim" dir="ltr">
                  {ticket.date}
                </p>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="rounded-[6px] border border-border px-3 py-1.5 text-xs text-text transition-colors hover:border-white/20"
                  >
                    مشاهده
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
