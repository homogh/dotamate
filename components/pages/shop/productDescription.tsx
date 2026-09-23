/**
 * Renders the admin's plain-text description with a tiny, safe subset of
 * markdown: blank line = new block, "## " = heading, lines starting with
 * "- " = bullet list. Everything is rendered as text (no HTML injection).
 */
export function ProductDescription({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-4 text-[14px] leading-[2] text-text-dim">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h3 key={i} className="pt-2 text-[17px] font-black text-text">
              {block.slice(3)}
            </h3>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="flex flex-col gap-2">
              {lines.map((l, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-primary" />
                  {l.trim().slice(2)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}
