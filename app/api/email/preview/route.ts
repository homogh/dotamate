import { NextRequest, NextResponse } from "next/server";

import { EMAIL_ASSET_ORIGIN, siteUrl } from "@/app/lib/emailLayout";
import { passwordResetEmail, signupReminderEmail } from "@/app/lib/emailTemplates";

// Dev-only: renders an email template in the browser while designing it.
// /api/email/preview?template=reset | reminder-1|2|3 [&stage=steam|profile]
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const template = request.nextUrl.searchParams.get("template") ?? "reset";
  const stage = request.nextUrl.searchParams.get("stage") === "profile" ? "profile" : "steam";
  const step = Number(template.replace("reminder-", ""));

  const email =
    step === 1 || step === 2 || step === 3
      ? signupReminderEmail({
          step,
          displayName: "SinaMid",
          stage,
          continueUrl: siteUrl(`/signup/${stage}`),
          unsubscribeUrl: siteUrl("/unsubscribe"),
          stats: { players: 1240, lobbiesThisWeek: 318 },
        })
      : passwordResetEmail(siteUrl("/reset-password?token=preview"));

  // Images point at the live site; serve the local copies so unreleased ones show too.
  const html = email.html.replaceAll(`${EMAIL_ASSET_ORIGIN}/images/email/`, "/images/email/");
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
