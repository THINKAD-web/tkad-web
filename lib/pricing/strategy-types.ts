import type { MediaPriceOption, MediaPricePeriodKey } from "@/lib/media-data";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";
import type { PartialPeriodRatesMap } from "@/lib/media-partial-period-rates";
import type { MediaOnlineSpec } from "@prisma/client";

export type QuoteCalculatorMedia = {
  id: string;
  name: string;
  location: string;
  type?: string | null;
  catalogChannel?: string | null;
  price: number;
  pricePeriod?: MediaPricePeriodKey | string | null;
  priceOptions?: MediaPriceOption[] | null;
  partialPeriodRates?: PartialPeriodRatesMap | null;
  dailyFootfall?: number | null;
  impressions?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type QuoteLineItem = {
  mediaId: string;
  mediaName: string;
  location: string;
  periodDays: number;
  unitPriceWon: number;
  lineSupplyWon: number;
  impressions: number;
  quantity?: number;
  quantityLabel?: string;
  lat?: number;
  lng?: number;
};

export type PricingStrategyContext = {
  startDate: Date;
  endDate: Date;
  periodDays: number;
  monthFactor: number;
  discountRate: number;
  periodKey?: string;
  mediaPriceOptionIndex?: Record<string, number>;
  mediaSelections?: QuoteMediaSelectionSnapshot[];
  useOptionPricing: boolean;
  campaignPeriod: string | null;
  campaignDays: number;
  selectionMap: Map<string, QuoteMediaSelectionSnapshot>;
  poMap: Record<string, number>;
};

export type OnlineSpecForPricing = Pick<
  MediaOnlineSpec,
  | "platform"
  | "minBudget"
  | "cpcMin"
  | "cpcMax"
  | "cpmMin"
  | "cpmMax"
>;

export type QuoteCalculatorMediaWithOnline = QuoteCalculatorMedia & {
  onlineSpec?: OnlineSpecForPricing | null;
};

export type PricingStrategyLineInput = {
  media: QuoteCalculatorMediaWithOnline;
  ctx: PricingStrategyContext;
};

export interface PricingStrategy {
  calculateLine(input: PricingStrategyLineInput): QuoteLineItem;
}
