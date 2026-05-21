import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type AnalyticsProviderKey = "ga4" | "gtm";

export type AnalyticsIntegrationState = {
  provider: AnalyticsProviderKey;
  enabled: boolean;
  measurementId: string;
  containerId: string;
  notes: string;
  updatedAt: string | null;
};

export type AnalyticsSettingsResponse = {
  configured: boolean;
  integrations: Record<AnalyticsProviderKey, AnalyticsIntegrationState>;
};

export type PublicAnalyticsConfig = {
  ga4: { measurementId: string } | null;
  gtm: { containerId: string } | null;
};

export class AnalyticsStorageUnavailableError extends Error {
  constructor(message = "Analytics settings storage unavailable") {
    super(message);
    this.name = "AnalyticsStorageUnavailableError";
  }
}

const GA4_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{5,}$/i;
const GTM_CONTAINER_ID_RE = /^GTM-[A-Z0-9]+$/i;

function isMissingAnalyticsTableError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return true;
  }

  if (error instanceof Error) {
    return /analytics_integrations|does not exist|ColumnNotFound/i.test(
      error.message,
    );
  }

  return false;
}

function createDefaultState(
  provider: AnalyticsProviderKey,
): AnalyticsIntegrationState {
  return {
    provider,
    enabled: false,
    measurementId: "",
    containerId: "",
    notes: "",
    updatedAt: null,
  };
}

function defaultSettingsResponse(configured: boolean): AnalyticsSettingsResponse {
  return {
    configured,
    integrations: {
      ga4: createDefaultState("ga4"),
      gtm: createDefaultState("gtm"),
    },
  };
}

const providerSchema = z.object({
  enabled: z.boolean(),
  measurementId: z.string().trim().max(64).default(""),
  containerId: z.string().trim().max(64).default(""),
  notes: z.string().trim().max(1000).default(""),
});

const analyticsSettingsSchema = z
  .object({
    ga4: providerSchema,
    gtm: providerSchema,
  })
  .superRefine((value, ctx) => {
    if (value.ga4.enabled && !GA4_MEASUREMENT_ID_RE.test(value.ga4.measurementId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid GA4 measurement ID (for example: G-ABC123XYZ).",
        path: ["ga4", "measurementId"],
      });
    }

    if (value.gtm.enabled && !GTM_CONTAINER_ID_RE.test(value.gtm.containerId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid GTM container ID (for example: GTM-ABC1234).",
        path: ["gtm", "containerId"],
      });
    }
  });

export type AnalyticsSettingsInput = z.infer<typeof analyticsSettingsSchema>;

export function parseAnalyticsSettingsInput(
  input: unknown,
): AnalyticsSettingsInput {
  return analyticsSettingsSchema.parse(input);
}

function normalizeSettingsRows(
  rows: Array<{
    provider: AnalyticsProviderKey;
    enabled: boolean;
    measurementId: string | null;
    containerId: string | null;
    notes: string | null;
    updatedAt: Date;
  }>,
): AnalyticsSettingsResponse {
  const base = defaultSettingsResponse(true);

  for (const row of rows) {
    base.integrations[row.provider] = {
      provider: row.provider,
      enabled: row.enabled,
      measurementId: row.measurementId ?? "",
      containerId: row.containerId ?? "",
      notes: row.notes ?? "",
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  return base;
}

export async function getAnalyticsSettingsForAdmin(): Promise<AnalyticsSettingsResponse> {
  if (!isDatabaseConfigured()) return defaultSettingsResponse(false);

  try {
    const db = getPrisma();
    const rows = await db.analyticsIntegration.findMany({
      select: {
        provider: true,
        enabled: true,
        measurementId: true,
        containerId: true,
        notes: true,
        updatedAt: true,
      },
    });

    return normalizeSettingsRows(rows);
  } catch (error) {
    if (isMissingAnalyticsTableError(error)) {
      return defaultSettingsResponse(false);
    }
    throw error;
  }
}

export async function saveAnalyticsSettings(
  input: AnalyticsSettingsInput,
): Promise<AnalyticsSettingsResponse> {
  if (!isDatabaseConfigured()) {
    throw new AnalyticsStorageUnavailableError();
  }

  const db = getPrisma();

  try {
    await db.$transaction([
      db.analyticsIntegration.upsert({
        where: { provider: "ga4" },
        update: {
          enabled: input.ga4.enabled,
          measurementId: input.ga4.measurementId || null,
          containerId: null,
          notes: input.ga4.notes || null,
        },
        create: {
          provider: "ga4",
          enabled: input.ga4.enabled,
          measurementId: input.ga4.measurementId || null,
          containerId: null,
          notes: input.ga4.notes || null,
        },
      }),
      db.analyticsIntegration.upsert({
        where: { provider: "gtm" },
        update: {
          enabled: input.gtm.enabled,
          measurementId: null,
          containerId: input.gtm.containerId || null,
          notes: input.gtm.notes || null,
        },
        create: {
          provider: "gtm",
          enabled: input.gtm.enabled,
          measurementId: null,
          containerId: input.gtm.containerId || null,
          notes: input.gtm.notes || null,
        },
      }),
    ]);
  } catch (error) {
    if (isMissingAnalyticsTableError(error)) {
      throw new AnalyticsStorageUnavailableError();
    }
    throw error;
  }

  return getAnalyticsSettingsForAdmin();
}

function envGa4MeasurementId(): string | null {
  const id =
    process.env.NEXT_PUBLIC_GA_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id || !GA4_MEASUREMENT_ID_RE.test(id)) return null;
  return id;
}

export async function getPublicAnalyticsConfig(): Promise<PublicAnalyticsConfig> {
  const settings = await getAnalyticsSettingsForAdmin();
  const { ga4, gtm } = settings.integrations;
  const envGa4 = envGa4MeasurementId();

  const dbGa4 =
    settings.configured && ga4.enabled && ga4.measurementId
      ? ga4.measurementId
      : null;

  return {
    ga4: dbGa4 || envGa4 ? { measurementId: dbGa4 ?? envGa4! } : null,
    gtm:
      settings.configured && gtm.enabled && gtm.containerId
        ? { containerId: gtm.containerId }
        : null,
  };
}
