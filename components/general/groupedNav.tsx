"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { findActiveNav, type GroupedNavGroup, type GroupedNavItem } from "@/app/lib/navGroups";

gsap.registerPlugin(useGSAP);

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatCount(count: number) {
  return count > 99 ? "۹۹+" : count.toLocaleString("fa-IR");
}

/**
 * Sidebar navigation as accordion dropdowns — shared by the admin and client
 * panels (desktop sidebar + mobile drawer). One group is open at a time, and
 * the group holding the current page opens itself whenever navigation lands in it.
 */
export function GroupedNav({
  root,
  groups,
  header,
  footer,
  onNavigate,
  className,
}: {
  root: GroupedNavItem;
  groups: GroupedNavGroup[];
  header?: ReactNode;
  footer?: ReactNode;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const active = findActiveNav(pathname, root, groups);
  const activeHref = active?.item.href ?? null;
  const activeGroupId = active?.group?.id ?? null;

  const [openId, setOpenId] = useState<string | null>(activeGroupId);
  const [trackedGroupId, setTrackedGroupId] = useState(activeGroupId);
  if (activeGroupId !== trackedGroupId) {
    setTrackedGroupId(activeGroupId);
    if (activeGroupId) setOpenId(activeGroupId);
  }

  const rootActive = activeHref === root.href;
  const RootIcon = root.icon;

  return (
    <nav className={cn("flex w-full flex-col gap-1.5", className)}>
      {header}

      <Link
        href={root.href}
        onClick={onNavigate}
        className={cn(
          "group/root flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors duration-300",
          rootActive ? "bg-primary text-white shadow-[0_8px_24px_-10px] shadow-primary" : "text-white/90 hover:bg-white/[0.04]"
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-transform duration-300 group-hover/root:scale-105",
            rootActive ? "bg-white/15" : "bg-white/[0.04] text-text-dim"
          )}
        >
          <RootIcon size={17} />
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[14px] font-bold" dir="auto">
          {root.label}
        </span>
      </Link>

      <div className="mx-3 my-1.5 h-px bg-border" />

      {groups.map((group) => (
        <NavGroup
          key={group.id}
          group={group}
          open={openId === group.id}
          activeHref={activeHref}
          onToggle={() => setOpenId((id) => (id === group.id ? null : group.id))}
          onNavigate={onNavigate}
        />
      ))}

      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </nav>
  );
}

function NavGroup({
  group,
  open,
  activeHref,
  onToggle,
  onNavigate,
}: {
  group: GroupedNavGroup;
  open: boolean;
  activeHref: string | null;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const prevOpen = useRef(open);
  const prevActive = useRef(activeHref);
  // React owns the panel's starting height only; GSAP drives it after mount.
  const [initiallyOpen] = useState(open);
  // Sidebar and mobile drawer both mount the menu, so ids must be per-instance.
  const panelId = useId();

  const Icon = group.icon;
  const containsActive = group.items.some((item) => item.href === activeHref);
  const badgeTotal = group.items.reduce((sum, item) => sum + (item.badge ?? 0), 0);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-nav-item]", panel);
      const changed = prevOpen.current !== open;
      prevOpen.current = open;

      if (!changed || prefersReducedMotion()) {
        gsap.set(panel, { height: open ? "auto" : 0 });
        gsap.set(items, { autoAlpha: open ? 1 : 0, x: 0 });
        return;
      }

      if (open) {
        gsap.to(panel, { height: "auto", duration: 0.5, ease: "power3.out", overwrite: true });
        gsap.fromTo(
          items,
          { autoAlpha: 0, x: 18 },
          { autoAlpha: 1, x: 0, duration: 0.42, ease: "back.out(1.6)", stagger: 0.05, delay: 0.08, overwrite: true }
        );
      } else {
        gsap.to(items, { autoAlpha: 0, x: 10, duration: 0.18, ease: "power1.in", stagger: { each: 0.025, from: "end" }, overwrite: true });
        gsap.to(panel, { height: 0, duration: 0.36, ease: "power2.inOut", delay: 0.06, overwrite: true });
      }
    },
    { dependencies: [open], scope: rootRef }
  );

  // Glowing marker on the rail that glides to whichever child is active.
  useGSAP(
    () => {
      const indicator = indicatorRef.current;
      const list = listRef.current;
      if (!indicator || !list) return;
      const target = list.querySelector<HTMLElement>('[data-nav-item][data-active="true"]');
      const changed = prevActive.current !== activeHref;
      prevActive.current = activeHref;

      if (!target) {
        gsap.to(indicator, { autoAlpha: 0, duration: 0.2, overwrite: true });
        return;
      }

      const height = target.offsetHeight * 0.56;
      const vars = { y: target.offsetTop + (target.offsetHeight - height) / 2, height, autoAlpha: 1 };
      if (!changed || prefersReducedMotion()) gsap.set(indicator, vars);
      else gsap.to(indicator, { ...vars, duration: 0.5, ease: "power3.out", overwrite: true });
    },
    { dependencies: [activeHref], scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative rounded-[12px] border transition-colors duration-300",
        open ? "border-border bg-white/[0.02]" : "border-transparent"
      )}
    >
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 rounded-[12px] transition-opacity duration-500", open ? "opacity-100" : "opacity-0")}
        style={{ background: `radial-gradient(130% 70% at 100% 0%, ${group.tone}1f, transparent 65%)` }}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "group/header relative flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-right transition-colors duration-300",
          open ? "text-text" : "text-white/90 hover:bg-white/[0.04]"
        )}
      >
        <span
          className="relative flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-all duration-300 group-hover/header:scale-105"
          style={{
            backgroundColor: open ? `${group.tone}26` : "rgba(255,255,255,0.04)",
            color: open || containsActive ? group.tone : undefined,
            boxShadow: open ? `0 0 18px -6px ${group.tone}` : undefined,
          }}
        >
          <Icon size={17} className={cn(!open && !containsActive && "text-text-dim")} />
          {containsActive && !open && (
            <span className="absolute -end-1 -top-1 flex size-2.5">
              <span className="absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping" style={{ backgroundColor: group.tone }} />
              <span className="relative inline-flex size-2.5 rounded-full border-2 border-surface-alt" style={{ backgroundColor: group.tone }} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold" dir="auto">
          {group.label}
        </span>
        {badgeTotal > 0 && !open ? (
          <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{formatCount(badgeTotal)}</span>
        ) : (
          <span
            className={cn(
              "rounded-full px-1.5 text-[11px] font-bold tabular-nums transition-colors duration-300",
              open ? "bg-white/[0.08] text-text" : "text-text-dim"
            )}
          >
            {group.items.length.toLocaleString("fa-IR")}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-text-dim transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            open && "rotate-180 text-text"
          )}
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        inert={!open}
        className="relative overflow-hidden"
        style={initiallyOpen ? undefined : { height: 0 }}
      >
        <div ref={listRef} className="relative ms-[27px] flex flex-col gap-0.5 border-s border-border pb-2 pe-2 ps-2.5 pt-0.5">
          <span
            ref={indicatorRef}
            aria-hidden
            className="pointer-events-none invisible absolute -start-[2px] top-0 w-[3px] rounded-full opacity-0"
            style={{ backgroundColor: group.tone, boxShadow: `0 0 10px ${group.tone}` }}
          />
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                data-nav-item
                data-active={active}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/item flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] transition-colors duration-200",
                  active ? "bg-white/[0.07] font-bold text-white" : "font-medium text-text-dim hover:bg-white/[0.04] hover:text-text"
                )}
              >
                <ItemIcon
                  size={15}
                  className="shrink-0 transition-transform duration-300 group-hover/item:scale-110"
                  style={active ? { color: group.tone } : undefined}
                />
                <span className="min-w-0 flex-1 truncate text-right transition-transform duration-300 group-hover/item:-translate-x-0.5" dir="auto">
                  {item.label}
                </span>
                {!!item.badge && (
                  <span className="shrink-0 rounded-full bg-danger px-1.5 py-px text-[10px] font-bold text-white">{formatCount(item.badge)}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
