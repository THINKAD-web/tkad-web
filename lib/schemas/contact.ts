export { contactLeadSchema } from "@/lib/contact-lead-schema";

import { z } from "zod";

const phoneRe = /^01[0-9]-?\d{3,4}-?\d{4}$/;

/** Legacy / simple contact form (contact page). */
export const contactSchema = z.object({
  company: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(50),
  phone: z.string().regex(phoneRe, "invalid_phone"),
  email: z.string().email().optional().or(z.literal("")),
  inquiryType: z.string().max(64).optional(),
  budget: z.string().max(64).optional(),
  message: z.string().min(10).max(2000),
  captchaToken: z.string().min(1).optional(),
  cfTurnstileToken: z.string().min(1).optional(),
  locale: z.enum(["ko", "en"]).optional(),
});

export type ContactFormInput = z.infer<typeof contactSchema>;
