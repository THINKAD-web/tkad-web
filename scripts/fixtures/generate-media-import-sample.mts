/** 샘플 OOH import 엑셀 생성: scripts/fixtures/media-import-sample.xlsx */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { MEDIA_EXCEL_STANDARD_HEADERS } from "../../lib/admin-media-excel-import.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "media-import-sample.xlsx");

const rows: string[][] = [
  [...MEDIA_EXCEL_STANDARD_HEADERS],
  [
    "샘플 전광판 A",
    "서울 강남구 테헤란로 123",
    "서울",
    "dooh",
    "전광판",
    "dooh",
    "12",
    "4",
    "1920x1080",
    "06:00-24:00",
    "20-30대,직장인",
    "month:1구좌:50000000|month:0.5구좌:40000000",
    "VAT 별도",
    "샘플 설명",
    "https://example.com/a.jpg;https://example.com/b.jpg",
    "운영 메모",
  ],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "medias");
writeFileSync(out, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("Wrote", out);
