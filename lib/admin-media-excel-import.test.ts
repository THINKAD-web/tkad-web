import assert from "node:assert/strict";
import test from "node:test";
import {
  convertExcelRowsToQuickAdd,
  parsePriceOptionsCell,
  type MediaExcelRow,
} from "@/lib/admin-media-excel-import";
import { validateQuickAddItems } from "@/lib/media-quick-add";

test("parsePriceOptionsCell — pipe 구분 period:label:price", () => {
  const opts = parsePriceOptionsCell(
    "month:1구좌:100000000|month:0.5구좌:80000000",
  );
  assert.equal(opts.length, 2);
  assert.equal(opts[0]!.price, 100_000_000);
  assert.equal(opts[1]!.label, "0.5구좌");
});

test("convertExcelRowsToQuickAdd — OOH 행 + 온라인 행 분리", () => {
  const rows: MediaExcelRow[] = [
    {
      rowIndex: 2,
      media_name: "코엑스 테스트",
      full_address: "서울 강남구 영동대로 513",
      region: "서울",
      sub_category: "전광판",
      media_type: "dooh",
      price_options: "month:1구좌:90000000",
      description: "테스트",
    },
    {
      rowIndex: 3,
      media_name: "네이버 검색",
      full_address: "온라인",
      main_category: "online",
      media_type: "dooh",
      price_options: "month:1:1000000",
    },
  ];
  const { items, failures } = convertExcelRowsToQuickAdd(rows);
  assert.equal(items.length, 1);
  assert.equal(failures.length, 1);
  assert.match(failures[0]!.message, /OOH/);

  const validated = validateQuickAddItems(items);
  assert.equal(validated.ok, true);
  if (validated.ok) {
    assert.equal(validated.items[0]!.price_per_month, 90_000_000);
    assert.equal(validated.items[0]!.price_options?.length, 1);
  }
});
