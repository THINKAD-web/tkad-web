import assert from "node:assert/strict";
import test from "node:test";
import { isAddonSurchargePriceOption } from "./media-price-addon-option.ts";
import {
  formatMediaDisplayPrice,
  getCheapestMediaPriceOption,
  resolveMediaDisplayPrice,
} from "./media-price-format.ts";

test("isAddon: guerrilla surcharge label", () => {
  assert.equal(
    isAddonSurchargePriceOption({
      label: "특수업종 추가 (주류 등)",
      description: "특수 업종 1장당 +500원 추가 (1회 집행 기준)",
    }),
    true,
  );
});

test("isAddon: false positives — place name / short-term / extension", () => {
  assert.equal(
    isAddonSurchargePriceOption({
      label: "가산디지털단지역 풀패키지 (조명 2기 + 영상 2기)",
      description: "조명 2기 + 영상 2기 전체 / 월 5,400,000원",
    }),
    false,
  );
  assert.equal(
    isAddonSurchargePriceOption({
      label: "7일",
      description: "2,500만원 (단기 할증 기준) / VAT 별도",
    }),
    false,
  );
  assert.equal(
    isAddonSurchargePriceOption({
      label: "15일 패키지",
      description: "15일 6,000,000원 (VAT 별도) / 추가 1일 40만원",
    }),
    false,
  );
});

const guerrilla = {
  price: 500,
  pricePeriod: "month" as const,
  priceOptions: [
    {
      label: "A2 성동구 (인쇄+부착)",
      price: 1650,
      period: "1회",
    },
    {
      label: "A2 성동구 외 서울 (인쇄+부착)",
      price: 1350,
      period: "1회",
    },
    {
      label: "A1 성동구 (인쇄+부착)",
      price: 2300,
      period: "1회",
    },
    {
      label: "A1 성동구 외 서울 (인쇄+부착)",
      price: 2000,
      period: "1회",
    },
    {
      label: "특수업종 추가 (주류 등)",
      price: 500,
      period: "1회",
      description: "특수 업종 1장당 +500원 추가 (1회 집행 기준) / 별도 안내",
    },
  ],
};

test("guerrilla: display cheapest is base 1350, not addon/root 500", () => {
  const d = resolveMediaDisplayPrice(guerrilla);
  assert.equal(d.priceWon, 1350);
  assert.equal(getCheapestMediaPriceOption(guerrilla)?.priceWon, 1350);
  assert.equal(formatMediaDisplayPrice(guerrilla, "ko"), "₩1,350/월");
});

test("root matching base product price stays eligible", () => {
  const m = {
    price: 1350,
    pricePeriod: "month" as const,
    priceOptions: [
      { label: "A2 성동구 외 서울", price: 1350, period: "1회" },
      {
        label: "특수업종 추가 (주류 등)",
        price: 500,
        period: "1회",
        description: "+500원 추가",
      },
    ],
  };
  assert.equal(resolveMediaDisplayPrice(m).priceWon, 1350);
});

test("media without addon options unchanged", () => {
  const m = {
    price: 10_000_000,
    pricePeriod: "month" as const,
    priceOptions: [
      { label: "20초", price: 10_000_000, period: "month" },
      { label: "30초", price: 15_000_000, period: "month" },
    ],
  };
  assert.equal(resolveMediaDisplayPrice(m).priceWon, 10_000_000);
});

test("euljiro short-term 할증 description is not addon — cheapest stays 7일", () => {
  const m = {
    price: 70_000_000,
    pricePeriod: "day" as const,
    priceOptions: [
      {
        label: "7일",
        price: 25_000_000,
        period: "7일",
        description: "2,500만원 (단기 할증 기준) / VAT 별도",
      },
      {
        label: "15일",
        price: 45_000_000,
        period: "15일",
        description: "4,500만원 (단기 할증 기준) / VAT 별도",
      },
      {
        label: "1개월",
        price: 70_000_000,
        period: "month",
        description: "7,000만원 / VAT 별도",
      },
    ],
  };
  assert.equal(resolveMediaDisplayPrice(m).priceWon, 25_000_000);
});
