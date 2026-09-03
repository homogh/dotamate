"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/general/card";
import { Pagination } from "@/components/general/pagination";

interface AuditEntry {
  id: number;
  action: string;
  actorName: string;
  targetType: string | null;
  targetId: number | null;
  detail: string | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  BAN_USER: "مسدودسازی کاربر",
  UNBAN_USER: "رفع مسدودیت کاربر",
  SUSPEND_USER: "تعلیق کاربر",
  UNSUSPEND_USER: "رفع تعلیق کاربر",
  WARN_USER: "ارسال اخطار",
  VERIFY_USER: "تایید رنک",
  UNVERIFY_USER: "لغو تایید رنک",
  DELETE_POST: "حذف پست",
  RESOLVE_REPORT: "بررسی گزارش",
  DISMISS_REPORT: "رد گزارش",
  CREATE_ROLE: "ایجاد نقش",
  UPDATE_ROLE: "ویرایش نقش",
  DELETE_ROLE: "حذف نقش",
  ASSIGN_ROLE: "تخصیص نقش",
  CREATE_ANNOUNCEMENT: "ایجاد اعلامیه",
  UPDATE_ANNOUNCEMENT: "ویرایش اعلامیه",
  DELETE_ANNOUNCEMENT: "حذف اعلامیه",
  PUBLISH_BLOG_POST: "انتشار مقاله",
  UPDATE_BLOG_POST: "ویرایش مقاله",
  DELETE_BLOG_POST: "حذف مقاله",
  UPDATE_REFERENCE_DATA: "ویرایش داده مرجع",
  CLOSE_TICKET: "بستن تیکت",
  REPLY_TICKET: "پاسخ به تیکت",
};

const ACTION_COLOR: Record<string, string> = {
  BAN_USER: "text-danger",
  DELETE_POST: "text-danger",
  DELETE_BLOG_POST: "text-danger",
  DELETE_ROLE: "text-danger",
  SUSPEND_USER: "text-[#ff9f0a]",
  WARN_USER: "text-[#ff9f0a]",
};

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/audit-log?page=${page}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setLogs(json.data.logs);
          setPageCount(json.data.pageCount);
        }
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full gap-3 p-5">
        {loading ? (
          <div className="flex h-40 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>
        ) : logs.length === 0 ? (
          <p className="w-full py-8 text-center text-[13px] text-text-dim" dir="auto">
            هنوز عملیاتی ثبت نشده.
          </p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex w-full items-center justify-between gap-4 rounded-[8px] border border-border bg-surface-alt p-4">
              <p className="shrink-0 text-[12px] tabular-nums text-text-dim" dir="ltr">
                {new Date(log.createdAt).toLocaleString("fa-IR")}
              </p>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[13px]">
                {log.detail && (
                  <span className="truncate text-text-dim" dir="auto">
                    ({log.detail})
                  </span>
                )}
                {log.targetType && (
                  <span className="text-text-dim" dir="auto">
                    {log.targetType}#{log.targetId}
                  </span>
                )}
                <span className={`font-bold ${ACTION_COLOR[log.action] ?? "text-accent"}`} dir="auto">
                  {ACTION_LABEL[log.action] ?? log.action}
                </span>
                <span className="text-text-dim" dir="auto">
                  توسط
                </span>
                <span className="font-black text-text" dir="auto">
                  {log.actorName}
                </span>
              </div>
            </div>
          ))
        )}

        <Pagination page={page} totalPages={pageCount} onChange={setPage} />
      </Card>
    </div>
  );
}
