import { z } from "zod";

export const recommendInputSchema = z.object({
  goal: z.enum(["awareness", "consideration", "launch"]),
  target: z.enum(["genz", "millennial", "family", "biz", "mass"]),
  budgetMaxMan: z.number().min(0).max(1_000_000),
  region: z.string().max(64),
  industry: z.enum([
    "retail",
    "fintech",
    "fmcg",
    "auto",
    "entertainment",
    "beauty",
    "other",
  ]),
  type: z.string().max(32).optional(),
  minVisibility: z.number().optional(),
  minDailyFootTraffic: z.number().optional(),
  locationKeywords: z.array(z.string()).optional(),
  preferredPeriodWeeks: z.number().optional(),
  placementHints: z.array(z.string()).optional(),
});

export const recommendRequestSchema = z.object({
  input: recommendInputSchema,
  seed: z.number().int().min(0).max(9999).optional(),
  limit: z.number().int().min(1).max(30).optional(),
  sessionId: z.string().max(64).optional(),
  locale: z.string().max(8).optional(),
  useClaude: z.boolean().optional(),
  captchaToken: z.string().min(1).optional(),
  turnstileToken: z.string().min(1).optional(),
});

export type RecommendRequestInput = z.infer<typeof recommendRequestSchema>;
