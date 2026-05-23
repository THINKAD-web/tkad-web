import { z } from "zod";
import { MEDIA_APPLICATION_MEDIA_TYPES } from "@/lib/media-application";

const phoneRe = /^01[0-9]-?\d{3,4}-?\d{4}$/;

export const mediaRegisterSchema = z.object({
  locale: z.enum(["ko", "en"]).optional(),
  companyName: z.string().min(1).max(120),
  contactName: z.string().min(2).max(50),
  contactPhone: z.string().regex(phoneRe),
  contactEmail: z.string().email().max(254),
  mediaName: z.string().min(2).max(120),
  mediaType: z.enum(MEDIA_APPLICATION_MEDIA_TYPES),
  address: z.string().min(5).max(300),
  addressDetail: z.string().max(200).optional(),
  zonecode: z.string().max(10).optional(),
  city: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  widthCm: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  isDigital: z.boolean().optional(),
  operatingHours: z.string().max(120).optional(),
  hasLighting: z.boolean().optional(),
  dailyFootfall: z.coerce.number().int().nonnegative().optional(),
  monthlyPrice: z.coerce.number().int().positive(),
  minFlightDays: z.coerce.number().int().positive().optional(),
  photoFrontUrl: z.string().url(),
  photoSideUrl: z.string().url(),
  photoNightUrl: z.string().url(),
  notes: z.string().max(2000).optional(),
  outreachToken: z.string().max(64).optional(),
  referralRef: z.string().max(64).optional(),
  captchaToken: z.string().min(1).optional(),
  turnstileToken: z.string().min(1).optional(),
});

export type MediaRegisterInput = z.infer<typeof mediaRegisterSchema>;
