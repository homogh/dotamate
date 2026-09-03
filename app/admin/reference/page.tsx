"use client";

import { useCallback, useEffect, useState } from "react";

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
  { category: "RANK", title: "لیست رنک‌های بازی (Ranks)", addLabel: "افزودن رنک جدید", orderLabel: "ترتیب" },
  { category: "POSITION", title: "نقش‌های بازی (Positions)", addLabel: "افزودن نقش جدید", orderLabel: "اولویت" },
  { category: "REGION", title: "ریجن‌ها و مناطق سرور (Regions)", addLabel: "افزودن ریجن جدید", orderLabel: "" },
  { category: "GAME_MODE", title: "حالت‌های بازی (Game Modes)", addLabel: "افزودن مود جدید", orderLabel: "" },
];

export default function AdminReferencePage() {
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
    if (!confirm("مطمئنی می‌خوای این مورد رو حذف کنی؟")) return;
    await fetch(`/api/admin/reference/${id}`, { method: "DELETE" });
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
              <div className="flex w-full items-center justify-between border-b border-border pb-3">
                <button
                  onClick={() => handleAdd(section.category)}
                  className="rounded-[6px] bg-primary px-3 py-1.5 text-[12px] font-bold text-white"
                  dir="auto"
                >
                  {section.addLabel} +
                </button>
                <p className="text-[16px] font-black text-text" dir="auto">
                  {section.title}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {entries.length === 0 ? (
                  <p className="w-full py-4 text-center text-[12px] text-text-dim" dir="auto">
                    موردی ثبت نشده.
                  </p>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="flex w-full items-center justify-between rounded-[8px] border border-border bg-surface-alt p-3">
                      <div className="flex items-center gap-2 text-[12px]">
                        <button onClick={() => handleDelete(entry.id)} className="text-danger" dir="auto">
                          حذف
                        </button>
                        <button onClick={() => handleEdit(entry)} className="text-accent" dir="auto">
                          ویرایش
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {section.category === "REGION" ? (
                          <button
                            onClick={() => toggleActive(entry)}
                            className={`text-[12px] font-bold ${entry.active ? "text-success" : "text-text-dim"}`}
                            dir="auto"
                          >
                            {entry.active ? "فعال" : "غیرفعال"}
                          </button>
                        ) : (
                          section.orderLabel && (
                            <p className="text-[12px] text-text-dim" dir="auto">
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
