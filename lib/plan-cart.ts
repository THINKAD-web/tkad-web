/** 플랜 장바구니 — localStorage `tkad_plan_cart` */

import { planCartMonthlyTotalWon } from "@/lib/plan-cart-pricing";
import {
  PLAN_CART_MAX_ITEMS,
  PLAN_CART_MAX_ITEMS_FREE,
  planCartMaxItems,
} from "@/lib/plan-cart-limits";

export {
  PLAN_CART_MAX_ITEMS,
  PLAN_CART_MAX_ITEMS_FREE,
  PLAN_CART_MAX_ITEMS_PRO,
  planCartMaxItems,
} from "@/lib/plan-cart-limits";

export const PLAN_CART_KEY = "tkad_plan_cart";
export const PLAN_CART_CHANGE_EVENT = "tkad:plan-cart-changed";

export type PlanCartAddedFrom =
  | "ai_recommend"
  | "planner"
  | "search"
  | "map"
  | "package";

export interface PlanCartItem {
  mediaId: string;
  mediaName: string;
  mediaType: string;
  region: string;
  price: number;
  /** 수량(대·기 등) — 미지정 시 카탈로그 기본값 */
  quantity?: number;
  /** `priceOptions` 패키지·등급 매체 — 선택 옵션 인덱스 */
  priceOptionIndex?: number;
  /** 버스 등급형 — 복수 등급·대수 */
  gradeSelections?: PlanCartGradeSelection[];
  /** package 매체 — 복수 옵션·수량 행 (형태는 gradeSelections 와 동일) */
  optionSelections?: PlanCartOptionSelection[];
  /** 매체별 제작비·설치비 등 (기간 총액에 1회 합산) */
  addonLines?: PlanCartAddonLine[];
  thumbnailUrl?: string;
  addedFrom: PlanCartAddedFrom;
  addedAt: string;
}

/** 등급형 버스 — 등급별 대수 */
export interface PlanCartGradeSelection {
  priceOptionIndex: number;
  quantity: number;
}

export type PlanCartOptionSelection = PlanCartGradeSelection;

/** 제작비·설치비 등 부가 비용 라인 (견적서 커스텀 라인과 동일 개념) */
export interface PlanCartAddonLine {
  id: string;
  name: string;
  unitPriceWon: number;
  quantity: number;
}

export interface PlanCart {
  items: PlanCartItem[];
  addonLines?: PlanCartAddonLine[];
  campaignGoal?: string;
  totalBudget?: number;
  duration?: number;
  industryKey?: string;
  updatedAt: string;
}

export type AddToPlanCartResult =
  | { ok: true; added: true }
  | { ok: true; added: false; reason: "duplicate" }
  | { ok: false; reason: "max_reached" };

export type BulkAddToPlanCartResult = {
  added: number;
  skippedDuplicate: number;
  skippedMax: number;
};

import {
  normalizePlanCartOptionSelections,
} from "@/lib/plan-cart-option-selections";

const EMPTY_CART = (): PlanCart => ({
  items: [],
  updatedAt: new Date().toISOString(),
});

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emitChange(cart: PlanCart) {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent(PLAN_CART_CHANGE_EVENT, { detail: cart }),
  );
}

function writeCart(cart: PlanCart) {
  if (!isBrowser()) return;
  const next: PlanCart = {
    ...cart,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(PLAN_CART_KEY, JSON.stringify(next));
  emitChange(next);
}

function normalizeItem(raw: unknown): PlanCartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.mediaId !== "string" || !o.mediaId.trim()) return null;
  if (typeof o.mediaName !== "string") return null;
  return {
    mediaId: o.mediaId,
    mediaName: o.mediaName,
    mediaType: typeof o.mediaType === "string" ? o.mediaType : "",
    region: typeof o.region === "string" ? o.region : "",
    price: typeof o.price === "number" && Number.isFinite(o.price) ? o.price : 0,
    quantity:
      typeof o.quantity === "number" &&
      Number.isFinite(o.quantity) &&
      o.quantity > 0
        ? Math.round(o.quantity)
        : undefined,
    priceOptionIndex:
      typeof o.priceOptionIndex === "number" &&
      Number.isFinite(o.priceOptionIndex) &&
      o.priceOptionIndex >= 0
        ? Math.round(o.priceOptionIndex)
        : undefined,
    gradeSelections: normalizeGradeSelections(o.gradeSelections),
    optionSelections: normalizePlanCartOptionSelections(o.optionSelections),
    addonLines: normalizeItemAddonLines(o.addonLines),
    thumbnailUrl:
      typeof o.thumbnailUrl === "string" ? o.thumbnailUrl : undefined,
    addedFrom:
      o.addedFrom === "ai_recommend" ||
      o.addedFrom === "planner" ||
      o.addedFrom === "search" ||
      o.addedFrom === "map" ||
      o.addedFrom === "package"
        ? o.addedFrom
        : "search",
    addedAt:
      typeof o.addedAt === "string"
        ? o.addedAt
        : new Date().toISOString(),
  };
}

function normalizeItemAddonLines(raw: unknown): PlanCartAddonLine[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeAddonLine)
    .filter((x): x is PlanCartAddonLine => x !== null);
  return out.length > 0 ? out : undefined;
}

function normalizeGradeSelection(raw: unknown): PlanCartGradeSelection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const priceOptionIndex =
    typeof o.priceOptionIndex === "number" &&
    Number.isFinite(o.priceOptionIndex) &&
    o.priceOptionIndex >= 0
      ? Math.round(o.priceOptionIndex)
      : null;
  const quantity =
    typeof o.quantity === "number" &&
    Number.isFinite(o.quantity) &&
    o.quantity > 0
      ? Math.round(o.quantity)
      : null;
  if (priceOptionIndex == null || quantity == null) return null;
  return { priceOptionIndex, quantity };
}

function normalizeGradeSelections(raw: unknown): PlanCartGradeSelection[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeGradeSelection)
    .filter((x): x is PlanCartGradeSelection => x !== null);
  return out.length > 0 ? out : undefined;
}

function normalizeAddonLine(raw: unknown): PlanCartAddonLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
  if (!id) return null;
  const name = typeof o.name === "string" ? o.name : "";
  return {
    id,
    name,
    unitPriceWon:
      typeof o.unitPriceWon === "number" && Number.isFinite(o.unitPriceWon)
        ? Math.max(0, Math.round(o.unitPriceWon))
        : 0,
    quantity:
      typeof o.quantity === "number" &&
      Number.isFinite(o.quantity) &&
      o.quantity > 0
        ? Math.round(o.quantity)
        : 1,
  };
}

export function newPlanCartAddonLineId(): string {
  return `addon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPlanCartAddonLine(
  partial?: Partial<Pick<PlanCartAddonLine, "name" | "unitPriceWon" | "quantity">>,
): PlanCartAddonLine {
  return {
    id: newPlanCartAddonLineId(),
    name: partial?.name ?? "",
    unitPriceWon: Math.max(0, partial?.unitPriceWon ?? 0),
    quantity: Math.max(1, partial?.quantity ?? 1),
  };
}

export function getPlanCart(): PlanCart {
  if (!isBrowser()) return EMPTY_CART();
  try {
    const raw = window.localStorage.getItem(PLAN_CART_KEY);
    if (!raw) {
      return { items: [], updatedAt: "" };
    }
    const parsed = JSON.parse(raw) as Partial<PlanCart>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map(normalizeItem)
          .filter((x): x is PlanCartItem => x !== null)
      : [];
    const addonLines = Array.isArray(parsed.addonLines)
      ? parsed.addonLines
          .map(normalizeAddonLine)
          .filter((x): x is PlanCartAddonLine => x !== null)
      : [];
    return {
      items,
      addonLines: addonLines.length > 0 ? addonLines : undefined,
      campaignGoal:
        typeof parsed.campaignGoal === "string"
          ? parsed.campaignGoal
          : undefined,
      totalBudget:
        typeof parsed.totalBudget === "number" ? parsed.totalBudget : undefined,
      duration:
        typeof parsed.duration === "number" ? parsed.duration : undefined,
      industryKey:
        typeof parsed.industryKey === "string" ? parsed.industryKey : undefined,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return EMPTY_CART();
  }
}

export function savePlanCartMeta(
  patch: Partial<
    Pick<PlanCart, "campaignGoal" | "totalBudget" | "duration" | "industryKey">
  >,
): PlanCart {
  const cart = getPlanCart();
  const next: PlanCart = {
    ...cart,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeCart(next);
  return next;
}

export function replacePlanCart(cart: PlanCart): void {
  writeCart({
    ...cart,
    items: cart.items
      .map((i) => normalizeItem(i))
      .filter((x): x is PlanCartItem => x !== null),
    addonLines: (cart.addonLines ?? [])
      .map((l) => normalizeAddonLine(l))
      .filter((x): x is PlanCartAddonLine => x !== null),
    updatedAt: cart.updatedAt || new Date().toISOString(),
  });
}

/** 서버 동기화 응답 반영 — updatedAt 을 서버 값 그대로 유지 */
export function applySyncedPlanCart(cart: PlanCart): void {
  if (!isBrowser()) return;
  const next: PlanCart = {
    ...cart,
    items: cart.items
      .map((i) => normalizeItem(i))
      .filter((x): x is PlanCartItem => x !== null),
    addonLines: (cart.addonLines ?? [])
      .map((l) => normalizeAddonLine(l))
      .filter((x): x is PlanCartAddonLine => x !== null),
    updatedAt: cart.updatedAt || new Date().toISOString(),
  };
  window.localStorage.setItem(PLAN_CART_KEY, JSON.stringify(next));
  emitChange(next);
}

export function addToPlanCart(
  item: Omit<PlanCartItem, "addedAt">,
  maxItems: number = PLAN_CART_MAX_ITEMS_FREE,
): AddToPlanCartResult {
  const cart = getPlanCart();
  if (cart.items.some((i) => i.mediaId === item.mediaId)) {
    return { ok: true, added: false, reason: "duplicate" };
  }
  if (cart.items.length >= maxItems) {
    return { ok: false, reason: "max_reached" };
  }
  writeCart({
    ...cart,
    items: [
      ...cart.items,
      { ...item, addedAt: new Date().toISOString() },
    ],
  });
  return { ok: true, added: true };
}

export function addManyToPlanCart(
  items: Omit<PlanCartItem, "addedAt">[],
  maxItems: number = PLAN_CART_MAX_ITEMS_FREE,
): BulkAddToPlanCartResult {
  let added = 0;
  let skippedDuplicate = 0;
  let skippedMax = 0;
  for (const item of items) {
    const result = addToPlanCart(item, maxItems);
    if (result.ok && result.added) added += 1;
    else if (result.ok && !result.added) skippedDuplicate += 1;
    else skippedMax += 1;
  }
  return { added, skippedDuplicate, skippedMax };
}

export function removeFromPlanCart(mediaId: string): void {
  const cart = getPlanCart();
  writeCart({
    ...cart,
    items: cart.items.filter((i) => i.mediaId !== mediaId),
  });
}

export function updatePlanCartItem(
  mediaId: string,
  patch: Partial<
    Pick<
      PlanCartItem,
      "quantity" | "priceOptionIndex" | "gradeSelections" | "optionSelections" | "addonLines"
    >
  >,
): void {
  const cart = getPlanCart();
  const items = cart.items.map((item) => {
    if (item.mediaId !== mediaId) return item;
    const next = { ...item };
    if ("quantity" in patch) {
      const q = patch.quantity;
      if (q == null || !Number.isFinite(q) || q <= 0) {
        delete next.quantity;
      } else {
        next.quantity = Math.round(q);
      }
    }
    if ("priceOptionIndex" in patch) {
      const idx = patch.priceOptionIndex;
      if (idx == null || !Number.isFinite(idx) || idx < 0) {
        delete next.priceOptionIndex;
      } else {
        next.priceOptionIndex = Math.round(idx);
      }
    }
    if ("gradeSelections" in patch) {
      const gs = patch.gradeSelections;
      if (!gs?.length) {
        delete next.gradeSelections;
      } else {
        next.gradeSelections = gs
          .map(normalizeGradeSelection)
          .filter((x): x is PlanCartGradeSelection => x !== null);
        if (next.gradeSelections.length === 0) delete next.gradeSelections;
      }
    }
    if ("optionSelections" in patch) {
      const os = patch.optionSelections;
      if (!os?.length) {
        delete next.optionSelections;
      } else {
        next.optionSelections = normalizePlanCartOptionSelections(os);
        if (!next.optionSelections?.length) delete next.optionSelections;
      }
    }
    if ("addonLines" in patch) {
      const al = patch.addonLines;
      if (!al?.length) {
        delete next.addonLines;
      } else {
        next.addonLines = al
          .map(normalizeAddonLine)
          .filter((x): x is PlanCartAddonLine => x !== null);
        if (next.addonLines.length === 0) delete next.addonLines;
      }
    }
    return next;
  });
  writeCart({ ...cart, items });
}

export function addPlanCartAddonLine(line: PlanCartAddonLine): void {
  const cart = getPlanCart();
  writeCart({
    ...cart,
    addonLines: [...(cart.addonLines ?? []), line],
  });
}

export function updatePlanCartAddonLine(
  id: string,
  patch: Partial<Pick<PlanCartAddonLine, "name" | "unitPriceWon" | "quantity">>,
): void {
  const cart = getPlanCart();
  const addonLines = (cart.addonLines ?? []).map((line) => {
    if (line.id !== id) return line;
    const next = { ...line, ...patch };
    if (patch.unitPriceWon != null) {
      next.unitPriceWon = Math.max(0, Math.round(patch.unitPriceWon));
    }
    if (patch.quantity != null) {
      next.quantity = Math.max(1, Math.round(patch.quantity));
    }
    return next;
  });
  writeCart({ ...cart, addonLines });
}

export function removePlanCartAddonLine(id: string): void {
  const cart = getPlanCart();
  const addonLines = (cart.addonLines ?? []).filter((line) => line.id !== id);
  writeCart({
    ...cart,
    addonLines: addonLines.length > 0 ? addonLines : undefined,
  });
}

export function reorderPlanCartItems(fromIndex: number, toIndex: number): void {
  const cart = getPlanCart();
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= cart.items.length ||
    toIndex >= cart.items.length ||
    fromIndex === toIndex
  ) {
    return;
  }
  const items = [...cart.items];
  const [moved] = items.splice(fromIndex, 1);
  if (!moved) return;
  items.splice(toIndex, 0, moved);
  writeCart({ ...cart, items });
}

export function clearPlanCart(): void {
  writeCart({ ...EMPTY_CART(), addonLines: undefined });
}

export function getPlanCartCount(): number {
  return getPlanCart().items.length;
}

export function isInPlanCart(mediaId: string): boolean {
  return getPlanCart().items.some((i) => i.mediaId === mediaId);
}

export function planCartMonthlyTotal(cart: PlanCart = getPlanCart()): number {
  return planCartMonthlyTotalWon(cart);
}

export const PLAN_CART_GOAL_OPTIONS = [
  { value: "brand", ko: "브랜드 인지도", en: "Brand awareness" },
  { value: "launch", ko: "신제품 런칭", en: "Product launch" },
  { value: "event", ko: "이벤트 홍보", en: "Event promotion" },
  { value: "sales", ko: "실적·전환", en: "Performance" },
  { value: "local", ko: "로컬 도달", en: "Local reach" },
] as const;

export const PLAN_CART_DURATION_OPTIONS = [
  { value: 1, ko: "1개월", en: "1 month" },
  { value: 2, ko: "2개월", en: "2 months" },
  { value: 3, ko: "3개월", en: "3 months" },
  { value: 6, ko: "6개월", en: "6 months" },
] as const;

export function planCartAddedFromLabel(
  from: PlanCartAddedFrom,
  isKo: boolean,
): string {
  const map: Record<PlanCartAddedFrom, { ko: string; en: string }> = {
    ai_recommend: { ko: "AI추천", en: "AI" },
    planner: { ko: "플래너", en: "Planner" },
    search: { ko: "검색", en: "Search" },
    map: { ko: "지도", en: "Map" },
    package: { ko: "패키지", en: "Package" },
  };
  return isKo ? map[from].ko : map[from].en;
}
