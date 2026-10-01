import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Always points at the live site, regardless of which env sends the email —
// localhost images would be unreachable by the recipient's mail client.
const LOGO_URL = "https://dotamate.ir/images/brand/dotamate-logo.png";
// Gmail (web/Android/iOS — all of it) strips @font-face/@import and always falls
// back to Tahoma, so Tahoma is tuned here as the real target, not an afterthought.
const EMAIL_FONT_STACK = "'Vazirmatn', Tahoma, Arial, sans-serif";

function passwordResetEmailHtml(resetUrl: string) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
  <head>
    <meta charset="utf-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#101114; font-family:${EMAIL_FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#101114; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#1c1e24; border:1px solid #2d2f39; border-radius:16px; overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 16px;">
                <img src="${LOGO_URL}" alt="دوتامیت" width="48" height="44" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px;">
                <h1 style="margin:0; font-size:22px; font-weight:700; font-family:${EMAIL_FONT_STACK}; color:#ffffff;">بازیابی رمز عبور</h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 32px 0;">
                <p style="margin:0; font-size:14.5px; line-height:2; font-family:${EMAIL_FONT_STACK}; color:#b7bac4;">
                  درخواست بازیابی رمز عبور برای حساب دوتامیت‌ت ثبت شده.
                  برای تعیین رمز جدید روی دکمه‌ی زیر بزن.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 32px 8px;">
                <a href="${resetUrl}"
                   style="display:inline-block; background-color:#8e7bff; color:#ffffff; font-size:16px; font-weight:bold; font-family:${EMAIL_FONT_STACK}; text-decoration:none; padding:15px 40px; border-radius:10px;">
                  تعیین رمز جدید
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 32px 0;">
                <p style="margin:0; font-size:12px; line-height:1.8; font-family:${EMAIL_FONT_STACK}; color:#6b6e7a;">
                  این لینک تا ۱ ساعت دیگه معتبره. اگه این درخواست رو تو نفرستادی،
                  همین ایمیل رو نادیده بگیر و رمزت دست‌نخورده می‌مونه.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 32px 32px;">
                <p style="margin:0; font-size:11px; word-break:break-all; font-family:${EMAIL_FONT_STACK}; color:#4a4d58;">
                  اگه دکمه کار نکرد، این لینک رو کپی کن: ${resetUrl}
                </p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td align="center" style="padding:20px 0;">
                <p style="margin:0; font-size:12px; font-family:${EMAIL_FONT_STACK}; color:#4a4d58;">© دوتامیت — Dota 2 teammate finder</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { error } = await getClient().emails.send({
    from: process.env.MAIL_FROM ?? "DotaMate <no-reply@dotamate.com>",
    to,
    subject: "بازیابی رمز عبور دوتامیت",
    html: passwordResetEmailHtml(resetUrl),
  });

  if (error) {
    throw new Error(error.message);
  }
}
