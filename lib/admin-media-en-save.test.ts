import assert from "node:assert/strict";
import test from "node:test";

/** Mirrors app/api/admin/medias/route.ts optStr — save must not invent EN fields. */
function optStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") return v.trim() || null;
  return undefined;
}

/** Mirrors POST create: only persist EN columns when client explicitly sends them. */
function applyEnFieldsOnCreate(body: Record<string, unknown>): {
  descriptionEn?: string | null;
  locationEn?: string | null;
} {
  const out: { descriptionEn?: string | null; locationEn?: string | null } = {};
  const descEn = optStr(body.descriptionEn);
  if (descEn !== undefined) out.descriptionEn = descEn;
  const locEn = optStr(body.locationEn);
  if (locEn !== undefined) out.locationEn = locEn;
  return out;
}

/** Admin form → API body (JJ-2): explicit null when empty, never Korean copy. */
function formEnFieldsToApi(form: {
  descriptionEn: string;
  locationEn: string;
  description: string;
  location: string;
}): { descriptionEn: string | null; locationEn: string | null } {
  return {
    descriptionEn: form.descriptionEn.trim() || null,
    locationEn: form.locationEn.trim() || null,
  };
}

test("POST create: omitting descriptionEn/locationEn leaves EN columns unset", () => {
  const applied = applyEnFieldsOnCreate({
    name: "시부야 테스트",
    description: "한국어 설명",
    location: "도쿄 시부야",
    country: "JP",
  });
  assert.equal("descriptionEn" in applied, false);
  assert.equal("locationEn" in applied, false);
});

test("POST create: explicit null EN fields store null, not Korean fallback", () => {
  const applied = applyEnFieldsOnCreate({
    description: "한국어 설명",
    location: "도쿄",
    descriptionEn: null,
    locationEn: null,
  });
  assert.equal(applied.descriptionEn, null);
  assert.equal(applied.locationEn, null);
});

test("formToApiBody EN path: empty form EN fields → null, not Korean copy", () => {
  const api = formEnFieldsToApi({
    descriptionEn: "",
    locationEn: "",
    description: "한국어 설명 본문",
    location: "1-2-3 Dogenzaka, Shibuya",
  });
  assert.equal(api.descriptionEn, null);
  assert.equal(api.locationEn, null);
  assert.notEqual(api.descriptionEn, "한국어 설명 본문");
  assert.notEqual(api.locationEn, "1-2-3 Dogenzaka, Shibuya");
});

test("formToApiBody EN path: only AI-filled values are sent", () => {
  const api = formEnFieldsToApi({
    descriptionEn: "English draft from AI",
    locationEn: "Shibuya, Tokyo",
    description: "한국어",
    location: "시부야",
  });
  assert.equal(api.descriptionEn, "English draft from AI");
  assert.equal(api.locationEn, "Shibuya, Tokyo");
});
