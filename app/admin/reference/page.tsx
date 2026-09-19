"use client";

import { useCallback, useEffect, useState } from "react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";

interface RefEntry {
  id: number;
  category: string;
  key: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

const SECTIONS = [
  { category: "RANK", title: "لیست رنک‌های بازی", titleEn: "(Ranks)", addLabel: "افزودن رنک جدید", orderLabel: "ترتیب" },
  { category: "POSITION", title: "نقش‌های بازی", titleEn: "(Positions)", addLabel: "افزودن نقش جدید", orderLabel: "اولویت" },
  { category: "REGION", title: "ریجن‌ها و مناطق سرور", titleEn: "(Regions)", addLabel: "افزودن ریجن جدید", orderLabel: "" },
  { category: "GAME_MODE", title: "حالت‌های بازی", titleEn: "(Game Modes)", addLabel: "افزودن مود جدید", orderLabel: "" },
];

export default function AdminReferencePage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [data, setData] = useState<Record<string, RefEntry[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return fetch("/api/admin/reference", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(category: string) {
    const label = prompt(`عنوان جدید برای ${category}:`);
    if (!label) return;
    const key = label.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 60);
    await fetch("/api/admin/reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, key, label }),
    });
    load();
  }

  async function handleEdit(entry: RefEntry) {
    const label = prompt("عنوان جدید:", entry.label);
    if (!label || label === entry.label) return;
    await fetch(`/api/admin/reference/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    load();
  }

  async function handleDelete(id: number) {
    if (!(await confirmAction({ message: "مطمئنی می‌خوای این مورد رو حذف کنی؟", danger: true, confirmLabel: "حذف" }))) return;
    const res = await fetch(`/api/admin/reference/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (res.ok) toast.success(json?.message ?? "حذف شد.");
    else toast.error(json?.message ?? "حذف با خطا مواجه شد.");
    load();
  }

  async function toggleActive(entry: RefEntry) {
    await fetch(`/api/admin/reference/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !entry.active }),
    });
    load();
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="flex w-full flex-wrap gap-6">
        {SECTIONS.map((section) => {
          const entries = data[section.category] ?? [];
          return (
            <Card key={section.category} tone="surface" noHover className="w-full min-w-[300px] flex-1 gap-4 p-6">
              <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <button
                  onClick={() => handleAdd(section.category)}
                  className="whitespace-nowrap rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white"
                  dir="auto"
                >
                  {section.addLabel} +
                </button>
                <p className="text-[16px] font-black text-text" dir="auto">
                  {section.title} <span className="whitespace-nowrap">{section.titleEn}</span>
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {entries.length === 0 ? (
                  <p className="w-full py-4 text-center text-[12px] text-text-dim" dir="auto">
                    موردی ثبت نشده.
                  </p>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[8px] border border-border bg-surface-alt p-3">
                      <div className="flex items-center gap-2 text-[12px]">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="whitespace-nowrap rounded-[6px] border border-danger/30 px-2.5 py-1.5 font-bold text-danger"
                          dir="auto"
                        >
                          حذف
                        </button>
                        <button
                          onClick={() => handleEdit(entry)}
                          className="whitespace-nowrap rounded-[6px] border border-border px-2.5 py-1.5 font-bold text-accent"
                          dir="auto"
                        >
                          ویرایش
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {section.category === "REGION" ? (
                          <button
                            onClick={() => toggleActive(entry)}
                            className={`whitespace-nowrap rounded-[6px] border px-2.5 py-1.5 text-[12px] font-bold ${
                              entry.active ? "border-success/30 text-success" : "border-border text-text-dim"
                            }`}
                            dir="auto"
                          >
                            {entry.active ? "فعال" : "غیرفعال"}
                          </button>
                        ) : (
                          section.orderLabel && (
                            <p className="whitespace-nowrap text-[12px] text-text-dim" dir="auto">
                              {section.orderLabel}: {entry.sortOrder}
                            </p>
                          )
                        )}
                        <p className="text-[14px] font-bold text-text" dir="auto">
                          {entry.label}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
