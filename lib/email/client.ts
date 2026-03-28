import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
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

export function isSmtpConfigured(): boolean {
  return transporter !== null;
}

if (!transporter && process.env.NODE_ENV !== "production") {
  console.warn(
    "[email] SMTP configuration not set. Auto-reply emails will be skipped.",
  );
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailParams): Promise<void> {
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

/** Returns whether the message was handed to SMTP (false if SMTP missing or send failed). */
export async function sendEmailWithResult(
  params: SendEmailParams,
): Promise<{ sent: boolean }> {
  if (!transporter) return { sent: false };

  const from = process.env.SMTP_FROM!;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return { sent: false };
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
  if (!transporter) {
    throw new Error("SMTP not configured");
  }

  const from = process.env.SMTP_FROM!;
  const pdfBuffer = Buffer.from(pdfBase64, "base64");

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

