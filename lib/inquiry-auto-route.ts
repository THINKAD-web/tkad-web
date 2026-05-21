import type { ContactBudgetV2, ContactIndustry, ContactRegion } from "@/lib/contact-lead-schema";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { pickRoundRobinRep } from "@/lib/ops/round-robin";
import { loadSalesTeam } from "@/lib/ops/sales-team";
import { notifyInquiryRoutedSlack } from "@/lib/inquiry-slack-notify";
import { setStoredInquiryAdminMeta } from "@/lib/contact-inquiry-labels";

export type InquiryRouteInput = {
  inquiryId: string;
  company: string;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  inquiryTypeLabel?: string;
  budgetLabel?: string;
  industryCode?: ContactIndustry;
  budgetCode?: ContactBudgetV2;
  regions?: ContactRegion[];
  locale?: "ko" | "en";
};

function buildCategoryCode(input: InquiryRouteInput): string {
  const parts: string[] = [];
  if (input.industryCode) parts.push(input.industryCode);
  if (input.budgetCode) parts.push(input.budgetCode);
  if (input.regions?.length) parts.push(input.regions[0]);
  if (input.inquiryTypeLabel?.includes("견적")) parts.push("quote");
  else if (input.inquiryTypeLabel?.includes("기획")) parts.push("plan");
  return parts.length ? parts.join("_") : "general";
}

/** 문의 생성 직후: 분류 · 담당 배정 · 파이프라인 · CRM · Slack */
export async function routeNewContactInquiry(
  input: InquiryRouteInput,
): Promise<{ assigneeEmail: string; categoryCode: string } | null> {
  if (!isDatabaseConfigured()) return null;

  const db = getPrisma();
  const categoryCode = buildCategoryCode(input);
  const rep = await pickRoundRobinRep(loadSalesTeam(), input.industryCode);
  const now = new Date();

  const inquiry = await db.contactInquiry.findUnique({
    where: { id: input.inquiryId },
    select: { message: true, pipelineCard: { select: { id: true } } },
  });
  if (!inquiry) return null;

  const messageWithAssignee = setStoredInquiryAdminMeta(inquiry.message, {
    assignee: rep.name,
    status: "new",
  });

  await db.contactInquiry.update({
    where: { id: input.inquiryId },
    data: {
      categoryCode,
      assigneeEmail: rep.email,
      assignedAt: now,
      message: messageWithAssignee,
    },
  });

  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    const account = await db.crmAccount.upsert({
      where: { email },
      create: {
        email,
        company: input.company,
        name: input.name,
        phone: input.phone,
        assignedTo: rep.email,
        firstInquiryAt: now,
        lastContactAt: now,
        pipelineStage: "new_inquiry",
      },
      update: {
        assignedTo: rep.email,
        lastContactAt: now,
      },
    });

    if (!inquiry.pipelineCard) {
      await db.pipelineCard.create({
        data: {
          stage: "new_inquiry",
          company: input.company,
          contactName: input.name,
          email,
          phone: input.phone,
          assignedTo: rep.email,
          firstInquiryAt: now,
          lastContactAt: now,
          sourceType: "inquiry",
          contactInquiryId: input.inquiryId,
          crmAccountId: account.id,
          userId: account.userId ?? null,
          tags: [categoryCode],
        },
      });
    } else {
      await db.pipelineCard.update({
        where: { id: inquiry.pipelineCard.id },
        data: { assignedTo: rep.email, tags: { push: categoryCode } },
      });
    }
  }

  void notifyInquiryRoutedSlack({
    inquiryId: input.inquiryId,
    company: input.company,
    name: input.name,
    categoryCode,
    assigneeName: rep.name,
    assigneeEmail: rep.email,
    budget: input.budgetLabel,
    inquiryType: input.inquiryTypeLabel,
  }).catch(console.error);

  return { assigneeEmail: rep.email, categoryCode };
}
