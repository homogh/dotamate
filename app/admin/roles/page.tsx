"use client";

import { useCallback, useEffect, useState } from "react";

import { useConfirm } from "@/app/stores/useConfirm";
import { useToast } from "@/app/stores/useToast";
import { Card } from "@/components/general/card";

interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  editable: boolean;
  userCount: number;
  permissions: Record<string, string>;
}

const RESOURCE_LABEL: Record<string, string> = {
  USERS: "کاربران",
  POSTS: "پست‌ها",
  REPORTS: "گزارش‌ها",
  SESSIONS: "جلسات",
  REFERENCE_DATA: "داده‌های مرجع",
  ANNOUNCEMENTS: "اعلامیه‌ها",
  AUDIT_LOG: "لاگ عملیات",
  BLOG: "وبلاگ",
  ROLES: "نقش‌ها",
  TICKETS: "تیکت‌های پشتیبانی",
};

const LEVEL_LABEL: Record<string, string> = { NONE: "بدون دسترسی", VIEW: "مشاهده", EDIT: "ویرایش" };
const LEVEL_STYLE: Record<string, string> = {
  NONE: "border-danger bg-danger/[0.12] text-danger",
  VIEW: "border-[#ff9f0a] bg-[#ff9f0a]/[0.13] text-[#ff9f0a]",
  EDIT: "border-success bg-success/[0.13] text-success",
};
const NEXT_LEVEL: Record<string, string> = { NONE: "VIEW", VIEW: "EDIT", EDIT: "NONE" };

export default function AdminRolesPage() {
  const confirmAction = useConfirm();
  const toast = useToast();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return fetch("/api/admin/roles", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setRoles(json.data.roles);
          setResources(json.data.resources);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateRole() {
    const name = prompt("نام نقش جدید:");
    if (!name) return;
    setBusy(true);
    await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    load();
  }

  async function cyclePermission(role: AdminRole, resource: string) {
    if (!role.editable) return;
    const current = role.permissions[resource] ?? "NONE";
    const next = NEXT_LEVEL[current];
    setBusy(true);
    await fetch(`/api/admin/roles/${role.id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, level: next }),
    });
    setBusy(false);
    load();
  }

  async function handleEditRole(role: AdminRole) {
    const name = prompt("نام نقش:", role.name);
    if (!name || !name.trim()) return;
    const description = prompt("توضیحات نقش:", role.description ?? "") ?? role.description ?? "";
    setBusy(true);
    await fetch(`/api/admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setBusy(false);
    load();
  }

  async function handleDeleteRole(role: AdminRole) {
    if (!(await confirmAction({ message: `مطمئنی می‌خوای نقش «${role.name}» رو حذف کنی؟`, danger: true, confirmLabel: "حذف" })))
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      toast.error(json?.message ?? "حذف نقش با خطا مواجه شد.");
      return;
    }
    toast.success(json?.message ?? "نقش حذف شد.");
    load();
  }

  if (loading) {
    return <div className="flex h-64 w-full items-center justify-center text-sm text-text-dim">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-8">
      <div className="flex w-full items-center justify-between">
        <button onClick={handleCreateRole} className="rounded-[8px] bg-primary px-5 py-2.5 text-[13px] font-black text-white" dir="auto">
          + ایجاد نقش جدید
        </button>
        <p className="text-[18px] font-black text-text" dir="auto">
          تعریف نقش‌های سیستم
        </p>
      </div>

      <div className="flex w-full flex-wrap gap-4">
        {roles.map((role) => (
          <Card key={role.id} tone="surface" noHover className="w-full min-w-[220px] flex-1 gap-3 p-5">
            <div className="flex w-full items-center justify-between">
              {role.editable ? (
                <span className="text-[13px] text-accent" dir="auto">
                  {role.userCount} کاربر
                </span>
              ) : (
                <span className="rounded-[4px] bg-white/[0.08] px-2 py-0.5 text-[11px] text-text-dim" dir="auto">
                  غیرقابل ویرایش
                </span>
              )}
              <div className="flex items-center gap-2">
                <p className="text-[16px] font-black text-text" dir="auto">
                  {role.name}
                </p>
                <div className="size-2.5 rounded-full bg-accent" />
              </div>
            </div>
            <p className="w-full text-right text-[12px] leading-[1.6] text-text-dim" dir="auto">
              {role.description}
            </p>
            {role.editable && (
              <div className="flex w-full items-center gap-2 border-t border-border pt-3">
                <button
                  disabled={busy}
                  onClick={() => handleEditRole(role)}
                  className="flex-1 rounded-[6px] border border-border bg-surface-alt px-3 py-1.5 text-[12px] font-bold text-text disabled:opacity-50"
                  dir="auto"
                >
                  ویرایش مشخصات
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleDeleteRole(role)}
                  className="flex-1 rounded-[6px] border border-danger bg-danger/10 px-3 py-1.5 text-[12px] font-bold text-danger disabled:opacity-50"
                  dir="auto"
                >
                  حذف نقش
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex w-full flex-col items-end gap-1">
        <p className="text-[18px] font-black text-text" dir="auto">
          ماتریس جامع دسترسی‌ها
        </p>
        <p className="text-[12px] text-text-dim" dir="auto">
          جدول تخصیص حقوق کاربری برای هر بخش — روی هر مقدار کلیک کن تا تغییر کنه
        </p>
      </div>

      <Card tone="surface" noHover className="w-full gap-4 p-6">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px] text-center">
            <thead>
              <tr className="rounded-[8px] bg-surface-alt text-[13px] text-text-dim">
                {roles.map((r) => (
                  <th key={r.id} className="p-3 font-bold" dir="auto">
                    {r.name}
                  </th>
                ))}
                <th className="p-3 text-right font-bold" dir="auto">
                  بخش سیستم
                </th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource} className="border-b border-border">
                  {roles.map((role) => {
                    const level = role.permissions[resource] ?? "NONE";
                    return (
                      <td key={role.id} className="p-3">
                        <button
                          disabled={busy || !role.editable}
                          onClick={() => cyclePermission(role, resource)}
                          className={`rounded-[6px] border px-3 py-1.5 text-[11px] font-bold disabled:cursor-not-allowed ${LEVEL_STYLE[level]}`}
                          dir="auto"
                        >
                          {LEVEL_LABEL[level]}
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right text-[14px] font-extrabold text-text" dir="auto">
                    {RESOURCE_LABEL[resource]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
