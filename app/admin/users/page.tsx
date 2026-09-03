"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Card } from "@/components/general/card";
import { Pagination } from "@/components/general/pagination";
import { RANK_LABEL } from "@/components/dashboard/postLabels";

interface AdminUser {
  id: number;
  displayName: string;
  email: string | null;
  rank: string;
  rankTier: number | null;
  rankVerification: string;
  banned: boolean;
  suspendedUntil: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "suspended", label: "تعلیق‌شده" },
  { value: "banned", label: "مسدود شده" },
];

function statusOf(u: AdminUser) {
  if (u.banned) return { label: "مسدود شده", cls: "bg-danger/[0.13] text-danger" };
  if (u.suspendedUntil && new Date(u.suspendedUntil) > new Date()) return { label: "تعلیق موقت", cls: "bg-[#ff9f0a]/[0.13] text-[#ff9f0a]" };
  return { label: "فعال", cls: "bg-success/[0.13] text-success" };
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (status) params.set("status", status);
    params.set("page", String(page));

    return fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setUsers(json.data.users);
          setPageCount(json.data.pageCount);
          setTotal(json.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [query, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const [prevFilterKey, setPrevFilterKey] = useState(`${query}|${status}`);
  const filterKey = `${query}|${status}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <Card tone="surface" noHover className="w-full flex-row flex-wrap items-center justify-between gap-4 p-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو بر اساس نام یا ایمیل..."
          dir="auto"
          className="w-full max-w-[280px] rounded-[8px] border border-border bg-surface-alt px-4 py-2.5 text-[13px] text-text placeholder:text-text-dim/60 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`rounded-[8px] px-4 py-2 text-[13px] ${
                status === o.value ? "bg-primary font-bold text-white" : "border border-border text-text-dim"
              }`}
              dir="auto"
            >
              {o.label}
            </button>
          ))}
        </div>
      </Card>

      <Card tone="surface" noHover className="w-full gap-4 p-5">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-right">
            <thead>
              <tr className="rounded-[8px] bg-surface-alt text-[13px] text-text-dim">
                <th className="p-3 text-right font-bold">عملیات</th>
                <th className="p-3 text-right font-bold">تایید استیم</th>
                <th className="p-3 text-right font-bold">وضعیت</th>
                <th className="p-3 text-right font-bold">تاریخ عضویت</th>
                <th className="p-3 text-right font-bold">رنک</th>
                <th className="p-3 text-right font-bold">ایمیل</th>
                <th className="p-3 text-right font-bold">نام کاربر</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[13px] text-text-dim">
                    کاربری با این فیلتر پیدا نشد.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const st = statusOf(u);
                  return (
                    <tr key={u.id} className="border-b border-border text-[13px]">
                      <td className="p-3">
                        <Link href={`/admin/users/${u.id}`} className="font-bold text-accent" dir="auto">
                          مشاهده
                        </Link>
                      </td>
                      <td className="p-3">
                        {u.rankVerification === "VERIFIED" && <CheckCircle2 size={16} className="text-success" />}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-[4px] px-2 py-0.5 text-[12px] font-bold ${st.cls}`} dir="auto">
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3 text-text-dim">
                        {new Date(u.createdAt).toLocaleDateString("fa-IR")}
                      </td>
                      <td className="p-3 font-bold text-accent" dir="auto">
                        {RANK_LABEL[u.rank]} {u.rankTier ?? ""}
                      </td>
                      <td className="p-3 text-text-dim" dir="ltr">
                        {u.email ?? "—"}
                      </td>
                      <td className="p-3 font-bold text-text" dir="auto">
                        {u.displayName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="w-full text-center text-[12px] text-text-dim" dir="auto">
          نمایش {users.length === 0 ? 0 : (page - 1) * 8 + 1}-{(page - 1) * 8 + users.length} از کل {total.toLocaleString("fa-IR")} کاربر
        </p>

        <Pagination page={page} totalPages={pageCount} onChange={setPage} />
      </Card>
    </div>
  );
}
