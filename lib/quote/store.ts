"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  QUOTE_CONFIRMATION_STEP,
  QUOTE_DRAFT_TTL_MS,
  QUOTE_LAST_INPUT_STEP,
  QUOTE_MAX_MEDIA,
  type QuoteCreativeAsset,
  type QuoteCreativeMode,
  type QuoteCustomerInfo,
  type QuoteDesignBrief,
  type QuoteIsoDate,
  type QuoteNetworkOption,
  type QuoteSource,
  type QuoteTimeSlot,
  type QuoteWizardStep,
} from "@/lib/quote/types";

export const QUOTE_STORAGE_KEY = "tkad-quote-draft-v1";
const QUOTE_PERSIST_VERSION = 1;

export type QuoteStoreState = {
  step: QuoteWizardStep;

  /** 진입 경로 + 식별자. PR-3 에서 URL 쿼리로 자동 채움. */
  source: QuoteSource;
  sourceId: string | null;

  /** Step 1: 매체 선택. */
  selectedMediaIds: string[];
  networkOptions: Record<string, QuoteNetworkOption>;
  priceOptionIndices: Record<string, number>;

  /** Step 2: 기간 + 송출 옵션 + 예산. */
  startDateIso: QuoteIsoDate | null;
  endDateIso: QuoteIsoDate | null;
  timeSlot: QuoteTimeSlot;
  budgetKrw: number | null;

  /** Step 3: 소재. */
  creativeMode: QuoteCreativeMode;
  uploadedAssets: QuoteCreativeAsset[];
  needsDesignService: boolean;
  designBrief: QuoteDesignBrief | null;

  /** Step 4: 고객 정보. */
  customer: QuoteCustomerInfo;

  /** 제출 완료 후 부여받은 견적 번호. */
  quoteNumber: string | null;

  /** 마지막 활동 시각(ms). 24시간 만료 판단 기준. */
  draftSavedAt: number | null;
};

const INITIAL_CUSTOMER: QuoteCustomerInfo = {
  company: "",
  name: "",
  email: "",
  phone: "",
};

const INITIAL_STATE: QuoteStoreState = {
  step: 1,
  source: "direct",
  sourceId: null,
  selectedMediaIds: [],
  networkOptions: {},
  priceOptionIndices: {},
  startDateIso: null,
  endDateIso: null,
  timeSlot: "all_day",
  budgetKrw: null,
  creativeMode: "later",
  uploadedAssets: [],
  needsDesignService: false,
  designBrief: null,
  customer: { ...INITIAL_CUSTOMER },
  quoteNumber: null,
  draftSavedAt: null,
};

function clampStep(n: number): QuoteWizardStep {
  if (n < 1) return 1;
  if (n > QUOTE_CONFIRMATION_STEP) return QUOTE_CONFIRMATION_STEP;
  return n as QuoteWizardStep;
}

export type QuoteStoreActions = {
  setStep: (step: QuoteWizardStep) => void;
  goNextStep: () => void;
  goPrevStep: () => void;

  setSource: (source: QuoteSource, sourceId?: string | null) => void;

  /** 매체 토글 — `QUOTE_MAX_MEDIA` 초과 추가는 무시. */
  toggleMedia: (mediaId: string) => void;
  setSelectedMediaIds: (ids: string[]) => void;
  clearSelectedMedia: () => void;
  setNetworkOption: (mediaId: string, opt: QuoteNetworkOption) => void;
  setPriceOptionIndex: (mediaId: string, index: number) => void;

  setStartDate: (iso: QuoteIsoDate | null) => void;
  setEndDate: (iso: QuoteIsoDate | null) => void;
  setTimeSlot: (slot: QuoteTimeSlot) => void;
  setBudget: (krw: number | null) => void;

  setCreativeMode: (mode: QuoteCreativeMode) => void;
  addUploadedAsset: (asset: QuoteCreativeAsset) => void;
  removeUploadedAsset: (assetId: string) => void;
  setNeedsDesignService: (v: boolean) => void;
  setDesignBrief: (brief: QuoteDesignBrief | null) => void;

  updateCustomer: (patch: Partial<QuoteCustomerInfo>) => void;

  /** 견적 제출 성공 후 콜. */
  markSubmitted: (quoteNumber: string) => void;

  /** 만료 draft 감지 시 폐기. */
  clearDraftIfExpired: () => boolean;
  resetAll: () => void;
};

export type QuoteStore = QuoteStoreState & QuoteStoreActions;

/**
 * 활동 시각 자동 갱신 — 모든 setter 가 본 헬퍼를 거쳐 `draftSavedAt` 을 업데이트한다.
 * 이를 통해 별도로 markActivity() 를 부르지 않아도 24시간 만료 시점이 정확히 갱신됨.
 */
function withActivity<T extends Partial<QuoteStoreState>>(patch: T): T {
  return { ...patch, draftSavedAt: Date.now() } as T;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setStep: (step) =>
        set(withActivity({ step: clampStep(step) })),

      goNextStep: () =>
        set((s) =>
          withActivity({
            step: clampStep(
              Math.min(s.step + 1, QUOTE_LAST_INPUT_STEP + 1),
            ),
          }),
        ),

      goPrevStep: () =>
        set((s) => withActivity({ step: clampStep(s.step - 1) })),

      setSource: (source, sourceId = null) =>
        set(withActivity({ source, sourceId })),

      toggleMedia: (mediaId) =>
        set((s) => {
          const has = s.selectedMediaIds.includes(mediaId);
          if (has) {
            return withActivity({
              selectedMediaIds: s.selectedMediaIds.filter(
                (id) => id !== mediaId,
              ),
            });
          }
          if (s.selectedMediaIds.length >= QUOTE_MAX_MEDIA) {
            return {};
          }
          return withActivity({
            selectedMediaIds: [...s.selectedMediaIds, mediaId],
          });
        }),

      setSelectedMediaIds: (ids) =>
        set(
          withActivity({
            selectedMediaIds: ids.slice(0, QUOTE_MAX_MEDIA),
          }),
        ),

      clearSelectedMedia: () =>
        set(
          withActivity({
            selectedMediaIds: [],
            networkOptions: {},
            priceOptionIndices: {},
          }),
        ),

      setNetworkOption: (mediaId, opt) =>
        set((s) =>
          withActivity({
            networkOptions: { ...s.networkOptions, [mediaId]: opt },
          }),
        ),

      setPriceOptionIndex: (mediaId, index) =>
        set((s) =>
          withActivity({
            priceOptionIndices: {
              ...s.priceOptionIndices,
              [mediaId]: Math.max(0, index),
            },
          }),
        ),

      setStartDate: (iso) => set(withActivity({ startDateIso: iso })),
      setEndDate: (iso) => set(withActivity({ endDateIso: iso })),
      setTimeSlot: (slot) => set(withActivity({ timeSlot: slot })),
      setBudget: (krw) =>
        set(
          withActivity({
            budgetKrw: krw != null && krw >= 0 ? Math.round(krw) : null,
          }),
        ),

      setCreativeMode: (mode) => set(withActivity({ creativeMode: mode })),

      addUploadedAsset: (asset) =>
        set((s) =>
          withActivity({
            uploadedAssets: [...s.uploadedAssets, asset],
          }),
        ),

      removeUploadedAsset: (assetId) =>
        set((s) =>
          withActivity({
            uploadedAssets: s.uploadedAssets.filter((a) => a.id !== assetId),
          }),
        ),

      setNeedsDesignService: (v) =>
        set(withActivity({ needsDesignService: v })),

      setDesignBrief: (brief) => set(withActivity({ designBrief: brief })),

      updateCustomer: (patch) =>
        set((s) =>
          withActivity({ customer: { ...s.customer, ...patch } }),
        ),

      markSubmitted: (quoteNumber) =>
        set(
          withActivity({
            quoteNumber,
            step: QUOTE_CONFIRMATION_STEP,
          }),
        ),

      clearDraftIfExpired: () => {
        const at = get().draftSavedAt;
        if (at == null) return false;
        if (Date.now() - at <= QUOTE_DRAFT_TTL_MS) return false;
        set({ ...INITIAL_STATE });
        return true;
      },

      resetAll: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: QUOTE_STORAGE_KEY,
      version: QUOTE_PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      /**
       * 입력값 + draftSavedAt 만 persist. step 은 hydration flash 방지를 위해 제외 — 진입 시
       * 항상 1단계부터 재개하되, "이전 작성 내용을 불러올까요?" 모달에서 선택 시
       * `setStep(...)` 으로 임의 단계로 이동.
       */
      partialize: (state) => ({
        source: state.source,
        sourceId: state.sourceId,
        selectedMediaIds: state.selectedMediaIds,
        networkOptions: state.networkOptions,
        priceOptionIndices: state.priceOptionIndices,
        startDateIso: state.startDateIso,
        endDateIso: state.endDateIso,
        timeSlot: state.timeSlot,
        budgetKrw: state.budgetKrw,
        creativeMode: state.creativeMode,
        uploadedAssets: state.uploadedAssets,
        needsDesignService: state.needsDesignService,
        designBrief: state.designBrief,
        customer: state.customer,
        quoteNumber: state.quoteNumber,
        draftSavedAt: state.draftSavedAt,
      }),
    },
  ),
);

/* ────────────────── Selectors (state-only, hydration-safe) ────────────────── */

/** 빈 draft 인지(=불러올 가치 없음) 판단. */
export function selectHasDraftContent(s: QuoteStoreState): boolean {
  return (
    s.selectedMediaIds.length > 0 ||
    s.startDateIso != null ||
    s.endDateIso != null ||
    s.uploadedAssets.length > 0 ||
    s.designBrief != null ||
    s.customer.company.length > 0 ||
    s.customer.name.length > 0 ||
    s.customer.email.length > 0 ||
    s.customer.phone.length > 0
  );
}

/** draft 가 24시간 초과로 만료되었는지. */
export function selectIsDraftExpired(s: QuoteStoreState): boolean {
  if (s.draftSavedAt == null) return false;
  return Date.now() - s.draftSavedAt > QUOTE_DRAFT_TTL_MS;
}

/** ISO 문자열 → Date 변환(빈 문자열/null → null). */
export function isoToDate(iso: QuoteIsoDate | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → ISO YYYY-MM-DD (timezone-stable, UTC 기반). */
export function dateToIso(d: Date): QuoteIsoDate {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
