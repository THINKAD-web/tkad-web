#!/usr/bin/env npx tsx
/**
 * Usage:
 *   npx tsx scripts/excel-to-quick-add-json.mts path/to/medias.xlsx [--out items.json]
 *
 * 첫 시트 · 1행 헤더(MEDIA_EXCEL_STANDARD_HEADERS) → QuickAddMediaJson[] JSON stdout 또는 --out.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import {
  convertExcelRowsToQuickAdd,
  excelGridToRows,
  mapExcelHeaderRow,
} from "../lib/admin-media-excel-import.ts";

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  let outPath: string | null = null;
  if (outIdx >= 0) {
    outPath = args[outIdx + 1] ?? null;
    args.splice(outIdx, 2);
  }
  const file = args[0];
  if (!file) {
    console.error(
      "Usage: npx tsx scripts/excel-to-quick-add-json.mts <file.xlsx> [--out items.json]",
    );
    process.exit(1);
  }

  const buf = readFileSync(resolve(file));
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    console.error("엑셀에 시트가 없습니다.");
    process.exit(1);
  }
  const sheet = wb.Sheets[sheetName]!;
  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];

  if (grid.length < 2) {
    console.error("헤더 + 데이터 1행 이상 필요합니다.");
    process.exit(1);
  }

  const headerRow = (grid[0] ?? []).map((c) => String(c));
  const headerMap = mapExcelHeaderRow(headerRow);
  if (headerMap.size === 0) {
    console.error(
      "인식된 표준 헤더가 없습니다. lib/admin-media-excel-import.ts MEDIA_EXCEL_STANDARD_HEADERS 참고.",
    );
    process.exit(1);
  }

  const rows = excelGridToRows(grid, headerMap);
  const { items, failures, warnings } = convertExcelRowsToQuickAdd(rows);

  for (const w of warnings) {
    console.warn(`[row ${w.rowIndex}] ${w.message}`);
  }
  for (const f of failures) {
    console.error(
      `[row ${f.rowIndex}] ${f.mediaName ?? "?"}: ${f.message}`,
    );
  }

  const json = JSON.stringify(items, null, 2);
  if (outPath) {
    writeFileSync(resolve(outPath), json, "utf8");
    console.error(
      `Wrote ${items.length} item(s) → ${outPath} (${failures.length} failed)`,
    );
  } else {
    process.stdout.write(json);
    if (!json.endsWith("\n")) process.stdout.write("\n");
  }

  process.exit(failures.length > 0 ? 2 : 0);
}

main();
