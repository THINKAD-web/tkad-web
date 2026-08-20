import assert from "node:assert/strict";
import { test } from "node:test";
import { stripLockedFieldsForMediaSave } from "@/lib/media/locked-fields";
import {
  MEDIA_REVIEW_STATUS,
  PHASE_B_ABC_FLAG_IDS,
  publicActiveMediaWhere,
  publicNotFlaggedMediaWhere,
  reviewReasonLabelKo,
} from "@/lib/media-review-status";

test("Phase B ABC 플래그 대상은 6건이며 D/E id 가 없다", () => {
  assert.equal(PHASE_B_ABC_FLAG_IDS.length, 6);
  assert.equal(new Set(PHASE_B_ABC_FLAG_IDS).size, 6);
});

test("public catalog where hides flagged only", () => {
  assert.deepEqual(publicNotFlaggedMediaWhere(), {
    reviewStatus: { not: MEDIA_REVIEW_STATUS.flagged },
  });
  const w = publicActiveMediaWhere({ isFeatured: true });
  assert.deepEqual(w, {
    AND: [
      { isActive: true },
      { reviewStatus: { not: "flagged" } },
      { isFeatured: true },
    ],
  });
});

test("reviewReason Korean labels", () => {
  assert.equal(
    reviewReasonLabelKo("package_magnitude"),
    "일유동 2M 이상 Package 매체 — 수치 확인 필요",
  );
});

test("lockdown does not strip reviewStatus (operational, not computed)", () => {
  const { cleaned, stripped } = stripLockedFieldsForMediaSave(
    {
      reviewStatus: "flagged",
      reviewReason: "package_magnitude",
      impressions: 1,
    },
    "KR",
  );
  assert.equal(cleaned.reviewStatus, "flagged");
  assert.equal(cleaned.reviewReason, "package_magnitude");
  assert.equal("impressions" in cleaned, false);
  assert.ok(stripped.includes("impressions"));
});
