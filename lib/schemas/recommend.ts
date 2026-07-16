import { z } from "zod";
import { PLANNER_BUSAN_ZONE_KEYS } from "@/lib/planner/busan-zones";
import { PLANNER_GYEONGGI_ZONE_KEYS } from "@/lib/planner/gyeonggi-zones";
import { PLANNER_INCHEON_ZONE_KEYS } from "@/lib/planner/incheon-zones";
import { PLANNER_SEOUL_ZONE_KEYS } from "@/lib/planner/seoul-zones";

export const recommendInputSchema = z.object({
  goal: z.enum(["awareness", "consideration", "launch", "conversion"]),
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
  seoulZones: z.array(z.enum(PLANNER_SEOUL_ZONE_KEYS)).optional(),
  busanZones: z.array(z.enum(PLANNER_BUSAN_ZONE_KEYS)).optional(),
  gyeonggiZones: z.array(z.enum(PLANNER_GYEONGGI_ZONE_KEYS)).optional(),
  incheonZones: z.array(z.enum(PLANNER_INCHEON_ZONE_KEYS)).optional(),
  regionCodes: z.array(z.string().max(32)).optional(),
  plannerCategories: z
    .array(z.enum(["digital", "static", "mobile"]))
    .optional(),
  freetextSource: z.string().max(2000).optional(),
});

export const recommendRequestSchema = z.object({
  input: recommendInputSchema,
  seed: z.number().int().min(0).max(9999).optional(),
  limit: z.number().int().min(1).max(30).optional(),
  sessionId: z.string().max(64).optional(),
  locale: z.string().max(8).optional(),
  useClaude: z.boolean().optional(),
  /** v1: AI 자유입력 모드는 네트워크 매체를 후보에서 제외(MediaNetwork 목적분류 부재) */
  excludeNetwork: z.boolean().optional(),
  captchaToken: z.string().min(1).optional(),
  turnstileToken: z.string().min(1).optional(),
});

export type RecommendRequestInput = z.infer<typeof recommendRequestSchema>;
