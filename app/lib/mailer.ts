import nodemailer from "nodemailer";

import { passwordResetEmail, type EmailContent } from "@/app/lib/emailTemplates";

// Resend over SMTP, not its HTTP API: api.resend.com sits behind Cloudflare and
// the VPS can't upload anything over ~1 KB to Cloudflare (requests just hang),
// while smtp.resend.com is on AWS and goes through fine. Same account and key.
const transport = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: { user: "resend", pass: process.env.RESEND_API_KEY ?? "" },
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
});

// Transient failures (connection problems, 4xx SMTP replies) are retried after these delays.
const RETRY_DELAYS_MS = [2_000, 5_000];

interface SendEmailOptions extends EmailContent {
  to: string;
  headers?: Record<string, string>;
}

function isTransient(error: unknown) {
  const { code, responseCode } = (error ?? {}) as { code?: string; responseCode?: number };
  if (responseCode) return responseCode >= 400 && responseCode < 500;
  return code === "ECONNECTION" || code === "ETIMEDOUT" || code === "ESOCKET" || code === "EDNS";
}

export async function sendEmail({ to, subject, html, text, headers }: SendEmailOptions) {
  for (let attempt = 0; ; attempt++) {
    try {
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? "DotaMate <no-reply@dotamate.com>",
        to,
        subject,
        html,
        text,
        headers,
      });
      return;
    } catch (error) {
      if (!isTransient(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({ to, ...passwordResetEmail(resetUrl) });
}
