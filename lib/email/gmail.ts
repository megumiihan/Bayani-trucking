// Server-only: import this from server actions, never from client components.
import nodemailer, { type Transporter } from "nodemailer";

// Sends mail through the company Gmail account over SMTP, using a Gmail
// App Password (Google Account → Security → 2-Step Verification → App passwords).
// Gmail saves each message to the account's Sent folder, and replies arrive in
// its inbox as usual. Consumer Gmail allows roughly 500 recipients a day.

let transporter: Transporter | null = null;

export function isGmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  const user = process.env.GMAIL_USER;
  // App passwords are shown with spaces ("abcd efgh ijkl mnop"); strip them.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) {
    throw new Error(
      "Email isn't set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD to the environment."
    );
  }
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendGmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ messageId: string }> {
  const from = process.env.GMAIL_FROM_NAME
    ? `"${process.env.GMAIL_FROM_NAME.replace(/"/g, "")}" <${process.env.GMAIL_USER}>`
    : process.env.GMAIL_USER;

  const info = await getTransporter().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  return { messageId: info.messageId };
}
