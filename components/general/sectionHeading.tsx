interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export function SectionHeading({ eyebrow, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3 text-center">
      <p
        className="w-full text-sm font-extrabold uppercase text-accent"
        dir="auto"
      >
        {eyebrow}
      </p>
      <h2 className="w-full text-balance text-[32px] font-black text-text" dir="auto">
        {title}
      </h2>
      <span className="h-[3px] w-12 rounded-full bg-primary" aria-hidden />
      {subtitle && (
        <p className="w-full text-base leading-[1.6] text-text-dim" dir="auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
