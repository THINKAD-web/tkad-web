import { z } from "zod";
import { rfpProposalBriefSchema } from "@/lib/rfp-proposal/types";

/** 클라이언트가 이미 만든 payload 로 바로 PDF */
const payloadPassthroughSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

/** brief + matchGroups 로 서버에서 payload 조립 후 PDF */
const buildAndExportSchema = z.object({
  brief: rfpProposalBriefSchema,
  matchGroups: z
    .array(
      z.object({
        groupId: z.string().min(1),
        groupLabel: z.string().min(1),
        input: z.unknown().optional(),
        mediaItems: z.array(
          z.object({
            mediaId: z.string().min(1),
            name: z.string(),
            nameEn: z.string().optional().default(""),
            location: z.string().optional().default(""),
            locationEn: z.string().optional().default(""),
            priceWon: z.number().optional().default(0),
            score: z.number().optional().default(0),
            role: z.enum(["main", "sub", "booster"]).optional().default("sub"),
            oneLine: z.string().optional().default(""),
            reasons: z
              .array(z.object({ ko: z.string(), en: z.string() }))
              .optional()
              .default([]),
            pinned: z.boolean().optional(),
          }),
        ),
      }),
    )
    .min(1)
    .max(20),
  excludedByGroup: z
    .record(z.string(), z.array(z.string().min(1).max(80)).max(50))
    .optional(),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
  recommendComment: z.string().max(4000).nullable().optional(),
});

export const rfpExportRequestSchema = z.union([
  payloadPassthroughSchema,
  buildAndExportSchema,
]);

export type RfpExportRequest = z.infer<typeof rfpExportRequestSchema>;
