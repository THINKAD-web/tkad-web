import { Resend } from "resend";
import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding?: "base64";
  }>;
};

const transporter =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

function envTrim(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function resendFromAddress(): string | null {
  const from = envTrim("RESEND_FROM");
  return from || null;
}

export function isResendConfigured(): boolean {
  return !!(envTrim("RESEND_API_KEY") && resendFromAddress());
}

export function isSmtpConfigured(): boolean {
  return transporter !== null;
}

/** Resend or SMTP is available for outbound mail. */
export function isEmailConfigured(): boolean {
  return isResendConfigured() || isSmtpConfigured();
}

function resendClient(): Resend | null {
  const key = envTrim("RESEND_API_KEY");
  if (!key) return null;
  return new Resend(key);
}

if (!isEmailConfigured() && process.env.NODE_ENV !== "production") {
  console.warn(
    "[email] Neither Resend nor SMTP is configured. Outbound mail is disabled.",
  );
}

function resendBody(text?: string, html?: string): { text: string; html: string } {
  const t = text?.trim() ? text : "";
  const h = html?.trim() ? html : "";
  if (h) {
    return { html: h, text: t || h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() };
  }
  return { text: t || "(no body)", html: `<pre style="white-space:pre-wrap">${(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>` };
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: SendEmailParams): Promise<void> {
  if (isResendConfigured()) {
    const resend = resendClient();
    if (!resend) return;
    try {
      const body = resendBody(text, html);
      const { error } = await resend.emails.send({
        from: resendFromAddress()!,
        to,
        subject,
        ...body,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, a.encoding || "base64"),
        })),
      });
      if (error) console.error("[email] Resend:", error);
    } catch (err) {
      console.error("[email] Resend failed:", err);
    }
    return;
  }

  if (!transporter) return;

  const from = process.env.SMTP_FROM!;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}

export type SendEmailResult = { sent: boolean; error?: string };

/** Returns whether the message was accepted by the provider. */
export async function sendEmailWithResult(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (isResendConfigured()) {
    const resend = resendClient();
    if (!resend) return { sent: false, error: "Resend client unavailable" };
    try {
      const body = resendBody(params.text, params.html);
      const { error } = await resend.emails.send({
        from: resendFromAddress()!,
        to: params.to,
        subject: params.subject,
        ...body,
        attachments: params.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, a.encoding || "base64"),
        })),
      });
      if (error) {
        console.error("[email] Resend:", error);
        return { sent: false, error: error.message };
      }
      return { sent: true };
    } catch (err) {
      console.error("[email] Resend failed:", err);
      return {
        sent: false,
        error: err instanceof Error ? err.message : "Resend send failed",
      };
    }
  }

  if (!transporter) return { sent: false, error: "SMTP not configured" };

  const from = envTrim("SMTP_FROM");

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, a.encoding || "base64"),
        contentType: a.filename.endsWith(".png")
          ? "image/png"
          : "application/octet-stream",
      })),
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return {
      sent: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}

type SendEmailWithPdfParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  pdfFilename: string;
  /** Raw base64 PDF (no data: prefix) */
  pdfBase64: string;
};

export async function sendEmailWithPdfAttachment({
  to,
  subject,
  text,
  html,
  pdfFilename,
  pdfBase64,
}: SendEmailWithPdfParams): Promise<void> {
  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  if (isResendConfigured()) {
    const resend = resendClient();
    if (!resend) throw new Error("Email not configured");
    const body = resendBody(text, html);
    const { error } = await resend.emails.send({
      from: resendFromAddress()!,
      to,
      subject,
      ...body,
      attachments: [{ filename: pdfFilename, content: pdfBuffer }],
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (!transporter) {
    throw new Error("Email not configured");
  }

  const from = process.env.SMTP_FROM!;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    console.error("[email] Failed to send email with PDF:", err);
    throw err;
  }
}
