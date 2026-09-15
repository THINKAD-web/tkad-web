import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicMediaWhere } from "./public-media-query.ts";

test("buildPublicMediaWhere — regionMain=busan includes national OR", () => {
  const where = buildPublicMediaWhere({ regionMain: "busan" });
  const and = (where as { AND: unknown[] }).AND ?? [where];
  const regionClause = and.find(
    (c) =>
      typeof c === "object" &&
      c !== null &&
      "OR" in c &&
      Array.isArray((c as { OR: unknown[] }).OR),
  ) as { OR: { regionMain: string }[] } | undefined;
  assert.ok(regionClause, "expected OR clause for regionMain filter");
  const mains = regionClause!.OR.map((x) => x.regionMain).sort();
  assert.deepEqual(mains, ["busan", "national"]);
});

test("buildPublicMediaWhere — regionMain=national is exact only", () => {
  const where = buildPublicMediaWhere({ regionMain: "national" });
  const and = (where as { AND: unknown[] }).AND ?? [where];
  const exact = and.find(
    (c) =>
      typeof c === "object" &&
      c !== null &&
      "regionMain" in c &&
      (c as { regionMain: string }).regionMain === "national",
  );
  assert.ok(exact, "expected exact national regionMain");
});
