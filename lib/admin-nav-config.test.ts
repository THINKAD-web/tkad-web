import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_NAV_PRIORITY_2,
  adminNavGroupDefs,
  adminNavPriority,
  filterAdminNavGroupItems,
} from "@/lib/admin-nav-config";

test("campaigns is P2 so it stays in the frequent-use row", () => {
  assert.equal(adminNavPriority("campaigns"), 2);
  assert.ok(ADMIN_NAV_PRIORITY_2.includes("campaigns"));
});

test("quotes group lists campaigns first among remaining P3 items only", () => {
  const quotes = adminNavGroupDefs.find((g) => g.id === "quotes");
  assert.ok(quotes);
  assert.equal(quotes.itemKeys[0], "campaigns");
  const visible = filterAdminNavGroupItems(quotes.itemKeys);
  assert.ok(!visible.includes("campaigns"));
});
