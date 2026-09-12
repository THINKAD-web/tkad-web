import assert from "node:assert/strict";
import test from "node:test";
import {
  compareMediaByMonthlyEquivalentPrice,
  type MediaPriceSortable,
} from "@/lib/media-price-format";

function media(
  id: string,
  price: number | null,
  pricePeriod: MediaPriceSortable["pricePeriod"] = "month",
): MediaPriceSortable {
  return { id, price, pricePeriod, priceOptions: undefined };
}

test("가격 낮은순: 협의가(quote_only, price=null) 매체는 정렬 방향과 무관하게 항상 맨 뒤", () => {
  const cheap = media("cheap", 100_000);
  const expensive = media("expensive", 9_000_000);
  const inquiry = media("inquiry", null);

  const asc = [inquiry, expensive, cheap].sort((a, b) =>
    compareMediaByMonthlyEquivalentPrice(a, b, "asc"),
  );
  assert.deepEqual(
    asc.map((m) => m.id),
    ["cheap", "expensive", "inquiry"],
  );

  const desc = [inquiry, expensive, cheap].sort((a, b) =>
    compareMediaByMonthlyEquivalentPrice(a, b, "desc"),
  );
  assert.deepEqual(
    desc.map((m) => m.id),
    ["expensive", "cheap", "inquiry"],
  );
});

test("가격 낮은순: 월 환산가 기준 오름차순 (일/주 단가 정규화)", () => {
  const perDay = media("per-day", 10_000, "day"); // 30만원/월 환산
  const perMonth = media("per-month", 200_000, "month");

  const asc = [perDay, perMonth].sort((a, b) =>
    compareMediaByMonthlyEquivalentPrice(a, b, "asc"),
  );
  assert.deepEqual(
    asc.map((m) => m.id),
    ["per-month", "per-day"],
  );
});
