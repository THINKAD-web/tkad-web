import { getPrisma } from "@/lib/prisma";
import { DEFAULT_CRM_EMAIL_TEMPLATES } from "@/lib/crm-email-templates-defaults";

export async function ensureDefaultEmailTemplates() {
  const db = getPrisma();
  for (const t of DEFAULT_CRM_EMAIL_TEMPLATES) {
    await db.emailTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText,
      },
      update: {},
    });
  }
}
