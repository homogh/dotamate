import type { ReactNode } from "react";

import { Reveal } from "@/components/general/reveal";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <section
      className="flex w-full flex-1 flex-col items-center justify-center px-6 py-20 md:px-[100px]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 720px 270px at 50% 0%, rgba(61,60,206,0.15) 0%, rgba(18,19,23,0) 80%), linear-gradient(90deg, #121317 0%, #121317 100%)",
      }}
    >
      <Reveal className="flex w-full max-w-[440px] flex-col gap-8">
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h1 className="w-full text-balance text-[28px] font-black text-text" dir="auto">
            {title}
          </h1>
          <p className="w-full text-sm leading-[1.7] text-text-dim" dir="auto">
            {subtitle}
          </p>
        </div>

        <div className="flex w-full flex-col gap-5 rounded-[12px] border border-border bg-surface p-8">
          {children}
        </div>

        {footer && (
          <p className="w-full text-center text-sm text-text-dim" dir="auto">
            {footer}
          </p>
        )}
      </Reveal>
    </section>
  );
}
