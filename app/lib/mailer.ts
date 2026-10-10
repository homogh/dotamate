import { Resend } from "resend";

import { passwordResetEmail, type EmailContent } from "@/app/lib/emailTemplates";

let client: Resend | null = null;

function getClient() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

interface SendEmailOptions extends EmailContent {
  to: string;
  headers?: Record<string, string>;
}

export async function sendEmail({ to, subject, html, text, headers }: SendEmailOptions) {
  const { error } = await getClient().emails.send({
    from: process.env.MAIL_FROM ?? "DotaMate <no-reply@dotamate.com>",
    to,
    subject,
    html,
    text,
    headers,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({ to, ...passwordResetEmail(resetUrl) });
}
