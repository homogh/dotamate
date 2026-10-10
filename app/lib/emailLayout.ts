// Shared building blocks for every outgoing email. Email clients ignore <style>
// blocks, flexbox and most modern CSS, so everything here is table-based with
// inline styles — keep it that way when adding blocks.

// Images always come from the live site, regardless of which env sends the
// email — localhost images would be unreachable by the recipient's mail client.
export const EMAIL_ASSET_ORIGIN = "https://dotamate.ir";

// Gmail (web/Android/iOS — all of it) strips @font-face/@import and always falls
// back to Tahoma, so Tahoma is tuned here as the real target, not an afterthought.
export const EMAIL_FONT = "'Vazirmatn', Tahoma, Arial, sans-serif";

// Matches the bottom fade baked into public/images/email/*.jpg, so the hero
// melts into the card without a seam. Change both together.
const CARD_BG = "#16171c";
const PAGE_BG = "#0c0d10";
const BORDER = "#26283080";
const TEXT = "#f2f3f7";
const TEXT_DIM = "#a9adb9";
const TEXT_MUTED = "#6b6e7a";
const ACCENT = "#8e7bff";
const PRIMARY = "#3d3cce";
const SUCCESS = "#22c55e";

export function emailAsset(fileName: string) {
  return `${EMAIL_ASSET_ORIGIN}/images/email/${fileName}`;
}

export function siteUrl(path = "") {
  return `${process.env.NEXT_PUBLIC_API_URL ?? EMAIL_ASSET_ORIGIN}${path}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const font = `font-family:${EMAIL_FONT};`;

function row(content: string, padding: string, align: "center" | "right" = "right") {
  return `<tr><td align="${align}" style="padding:${padding};">${content}</td></tr>`;
}

export function emailParagraph(html: string, options: { align?: "center" | "right"; size?: number } = {}) {
  const align = options.align ?? "right";
  return row(
    `<p style="margin:0; ${font} font-size:${options.size ?? 15}px; line-height:2.05; color:${TEXT_DIM}; text-align:${align};">${html}</p>`,
    "14px 36px 0",
    align,
  );
}

// Bulletproof button: the <td> carries the colour so it still shows when the
// client drops background-image (Outlook) or link padding.
export function emailButton(label: string, url: string) {
  return row(
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td align="center" bgcolor="${PRIMARY}" style="border-radius:14px; background-color:${PRIMARY}; background-image:linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%);">
          <a href="${url}" target="_blank" style="display:inline-block; padding:17px 48px; ${font} font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:14px;">${label}&nbsp;&nbsp;&larr;</a>
        </td>
      </tr>
    </table>`,
    "30px 36px 6px",
    "center",
  );
}

export interface EmailStep {
  label: string;
  state: "done" | "current" | "todo";
}

// Onboarding tracker: a circle per step plus a segmented progress bar under it.
export function emailSteps(steps: EmailStep[]) {
  const digits = ["۱", "۲", "۳", "۴", "۵"];
  const width = Math.floor(100 / steps.length);

  const circles = steps
    .map((step, index) => {
      const circle =
        step.state === "done"
          ? `background-color:${SUCCESS}; color:#0c0d10;`
          : step.state === "current"
            ? `background-color:${ACCENT}; background-image:linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%); color:#ffffff;`
            : `background-color:#22242c; color:${TEXT_MUTED}; border:1px solid #2f323c;`;
      const glyph = step.state === "done" ? "&#10003;" : digits[index];
      const labelColor = step.state === "todo" ? TEXT_MUTED : step.state === "current" ? TEXT : TEXT_DIM;
      return `<td align="center" valign="top" width="${width}%" style="padding:0 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr><td align="center" valign="middle" width="38" height="38" style="width:38px; height:38px; border-radius:50%; ${circle} ${font} font-size:16px; font-weight:700; line-height:38px;">${glyph}</td></tr>
        </table>
        <p style="margin:10px 0 0; ${font} font-size:12.5px; font-weight:${step.state === "current" ? 700 : 400}; color:${labelColor}; line-height:1.6;">${step.label}</p>
      </td>`;
    })
    .join("");

  const segments = steps
    .map((step) => {
      const color = step.state === "done" ? SUCCESS : step.state === "current" ? ACCENT : "#26282f";
      return `<td width="${width}%" style="padding:0 4px;"><div style="height:5px; line-height:5px; font-size:0; border-radius:3px; background-color:${color};">&nbsp;</div></td>`;
    })
    .join("");

  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="background-color:#1b1c22; border:1px solid ${BORDER}; border-radius:16px;">
      <tr><td style="padding:22px 14px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl"><tr>${circles}</tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="margin-top:16px;"><tr>${segments}</tr></table>
      </td></tr>
    </table>`,
    "26px 36px 0",
  );
}

export function emailFeatureList(items: { icon: string; title: string; text: string }[]) {
  const rows = items
    .map(
      (item) => `<tr>
        <td valign="top" width="46" style="padding:0 0 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" valign="middle" width="42" height="42" style="width:42px; height:42px; border-radius:12px; background-color:#221f3d; border:1px solid #3a3366; font-size:19px; line-height:42px;">${item.icon}</td>
          </tr></table>
        </td>
        <td valign="top" style="padding:0 14px 18px 0;">
          <p style="margin:0; ${font} font-size:14.5px; font-weight:700; color:${TEXT}; line-height:1.7;">${item.title}</p>
          <p style="margin:2px 0 0; ${font} font-size:13px; color:${TEXT_DIM}; line-height:1.85;">${item.text}</p>
        </td>
      </tr>`,
    )
    .join("");

  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">${rows}</table>`,
    "26px 36px 0",
  );
}

export function emailStats(stats: { value: string; label: string }[]) {
  const width = Math.floor(100 / stats.length);
  const cells = stats
    .map(
      (stat) => `<td align="center" width="${width}%" style="padding:0 5px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1b1c22; border:1px solid ${BORDER}; border-radius:14px;">
          <tr><td align="center" style="padding:18px 8px 16px;">
            <p style="margin:0; ${font} font-size:26px; font-weight:800; color:${TEXT}; line-height:1.3;">${stat.value}</p>
            <p style="margin:4px 0 0; ${font} font-size:12px; color:${TEXT_DIM}; line-height:1.6;">${stat.label}</p>
          </td></tr>
        </table>
      </td>`,
    )
    .join("");

  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl"><tr>${cells}</tr></table>`,
    "24px 31px 0",
  );
}

// Highlighted note box (tips, security notices). Tone sets the side stripe.
export function emailCallout(title: string, html: string, tone: "accent" | "warning" = "accent") {
  const stripe = tone === "warning" ? "#ff9f0a" : ACCENT;
  const bg = tone === "warning" ? "#231d14" : "#1d1b2e";
  return row(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="background-color:${bg}; border-radius:14px; border-right:4px solid ${stripe};">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0; ${font} font-size:13.5px; font-weight:700; color:${TEXT}; line-height:1.8;">${title}</p>
        <p style="margin:4px 0 0; ${font} font-size:13px; color:${TEXT_DIM}; line-height:1.95;">${html}</p>
      </td></tr>
    </table>`,
    "24px 36px 0",
  );
}

export function emailChips(chips: string[]) {
  const cells = chips
    .map(
      (chip) =>
        `<td style="padding:0 4px;"><span style="display:inline-block; padding:7px 14px; border-radius:999px; background-color:#1f2027; border:1px solid #2c2e37; ${font} font-size:12px; color:${TEXT_DIM}; white-space:nowrap;">${chip}</span></td>`,
    )
    .join("");
  return row(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;" dir="rtl"><tr>${cells}</tr></table>`, "18px 36px 0", "center");
}

export function emailFallbackLink(url: string) {
  return row(
    `<p style="margin:0; ${font} font-size:11.5px; line-height:1.9; color:${TEXT_MUTED}; text-align:center;">اگه دکمه کار نکرد، این لینک رو توی مرورگرت باز کن:</p>
     <p style="margin:6px 0 0; font-family:Consolas, Menlo, monospace; font-size:11px; line-height:1.7; color:#8a8d99; text-align:center; word-break:break-all;" dir="ltr"><a href="${url}" style="color:#8a8d99; text-decoration:underline;">${url}</a></p>`,
    "22px 36px 0",
    "center",
  );
}

export function emailDivider() {
  return row(`<div style="height:1px; line-height:1px; font-size:0; background-color:#24262e;">&nbsp;</div>`, "30px 36px 0");
}

interface EmailLayoutOptions {
  // Inbox preview line shown next to the subject; never rendered in the body.
  preheader: string;
  hero?: { src: string; alt: string };
  eyebrow?: string;
  title: string;
  // Rows built from the email* helpers above.
  content: string;
  // Why the recipient got this email (shown in the footer).
  footerReason: string;
  unsubscribeUrl?: string;
  // Open-tracking pixel (see emailTracking.ts).
  trackingPixelUrl?: string;
}

export function emailLayout(options: EmailLayoutOptions) {
  const hero = options.hero
    ? `<tr><td style="padding:0; font-size:0; line-height:0;">
        <img src="${options.hero.src}" alt="${options.hero.alt}" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0; border-radius:22px 22px 0 0;" />
      </td></tr>`
    : "";

  const eyebrow = options.eyebrow
    ? row(
        `<span style="display:inline-block; padding:6px 15px; border-radius:999px; background-color:#221f3d; border:1px solid #3a3366; ${font} font-size:12px; font-weight:700; color:#b9adff;">${options.eyebrow}</span>`,
        options.hero ? "0 36px 0" : "38px 36px 0",
        "center",
      )
    : "";

  const unsubscribe = options.unsubscribeUrl
    ? ` · <a href="${options.unsubscribeUrl}" style="color:${TEXT_MUTED}; text-decoration:underline;">دیگه از این ایمیل‌ها نمی‌خوام</a>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${options.title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;800&display=swap');
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:${PAGE_BG}; ${font}">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:${PAGE_BG}; font-size:1px; line-height:1px;">${options.preheader}${"&zwnj;&nbsp;".repeat(60)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAGE_BG}" style="background-color:${PAGE_BG};">
      <tr>
        <td align="center" style="padding:32px 14px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="max-width:600px;">
            <tr>
              <td align="center" style="padding:0 0 22px;">
                <a href="${siteUrl()}" target="_blank" style="text-decoration:none;">
                  <img src="${emailAsset("logo.png")}" alt="دوتامیت" width="44" height="40" style="display:inline-block; vertical-align:middle; border:0;" />
                  <span style="display:inline-block; vertical-align:middle; margin-right:10px; ${font} font-size:19px; font-weight:800; color:${TEXT};">دوتامیت</span>
                </a>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" bgcolor="${CARD_BG}" style="max-width:600px; background-color:${CARD_BG}; border:1px solid ${BORDER}; border-radius:24px;">
            ${hero}
            ${eyebrow}
            ${row(`<h1 style="margin:0; ${font} font-size:25px; font-weight:800; line-height:1.65; color:${TEXT}; text-align:center;">${options.title}</h1>`, "16px 36px 0", "center")}
            ${options.content}
            <tr><td style="padding:0 0 38px; font-size:0; line-height:0;">&nbsp;</td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="max-width:600px;">
            <tr>
              <td align="center" style="padding:26px 24px 0;">
                <p style="margin:0; ${font} font-size:12.5px; line-height:2; color:${TEXT_DIM};">
                  <a href="${siteUrl("/search-lobby")}" style="color:${TEXT_DIM}; text-decoration:none;">لابی‌ها</a>
                  &nbsp;·&nbsp;
                  <a href="${siteUrl("/players")}" style="color:${TEXT_DIM}; text-decoration:none;">بازیکن‌ها</a>
                  &nbsp;·&nbsp;
                  <a href="${siteUrl("/faq")}" style="color:${TEXT_DIM}; text-decoration:none;">سوالات متداول</a>
                  &nbsp;·&nbsp;
                  <a href="${siteUrl("/contact")}" style="color:${TEXT_DIM}; text-decoration:none;">پشتیبانی</a>
                </p>
                <p style="margin:12px 0 0; ${font} font-size:11.5px; line-height:2; color:${TEXT_MUTED};">
                  ${options.footerReason}${unsubscribe}
                </p>
                <p style="margin:10px 0 0; ${font} font-size:11px; color:#4a4d58;">© دوتامیت — پیدا کردن هم‌تیمی دوتا ۲</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${options.trackingPixelUrl ? `<img src="${options.trackingPixelUrl}" alt="" width="1" height="1" style="display:block; width:1px; height:1px; border:0;" />` : ""}
  </body>
</html>`;
}
