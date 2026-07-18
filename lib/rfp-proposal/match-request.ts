import { z } from "zod";
import { rfpProposalBriefSchema } from "@/lib/rfp-proposal/types";

export const rfpMatchRequestSchema = z.object({
  brief: rfpProposalBriefSchema,
  locale: z.enum(["ko", "en"]).optional().default("ko"),
  limitPerGroup: z.number().int().min(1).max(20).optional().default(8),
  excludeNetwork: z.boolean().optional().default(false),
  excludedMediaIds: z.array(z.string().min(1).max(80)).max(200).optional(),
  /** groupId → 해당 그룹에서만 제외 */
  excludedByGroup: z
    .record(z.string(), z.array(z.string().min(1).max(80)).max(50))
    .optional(),
  /** groupId → 강제 포함 매체 ID */
  includedByGroup: z
    .record(z.string(), z.array(z.string().min(1).max(80)).max(20))
    .optional(),
  strictRegionalPool: z.boolean().optional().default(false),
  seed: z.number().int().min(0).max(10_000).optional().default(0),
});

export type RfpMatchRequest = z.infer<typeof rfpMatchRequestSchema>;
