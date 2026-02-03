import { Resend } from "resend";

const resend =
  process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const defaultFrom =
  process.env.RESEND_FROM ?? "Cryptex <noreply@cryptex.local>";

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log("[Email:dev]", options);
    return;
  }

  await resend.emails.send({
    from: defaultFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const baseUrl = process.env.APP_URL ?? "";
  const link = `${baseUrl}/verify?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your Cryptex account",
    html: `<p>Welcome to Cryptex.</p><p>Verify your email to activate your account:</p><p><a href="${link}">${link}</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const baseUrl = process.env.APP_URL ?? "";
  const link = `${baseUrl}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your Cryptex password",
    html: `<p>You requested a password reset.</p><p>Reset your password here:</p><p><a href="${link}">${link}</a></p>`,
  });
}
