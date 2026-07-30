import test from "node:test";
import assert from "node:assert/strict";
import { buildAdminMediasListUrl } from "./admin-medias-list-url.ts";

test("buildAdminMediasListUrl — no query loads recent 500", () => {
  const url = buildAdminMediasListUrl();
  assert.equal(url, "/api/admin/medias?take=500");
});

test("buildAdminMediasListUrl — query uses server search take", () => {
  const url = buildAdminMediasListUrl({ q: "신촌역" });
  assert.equal(url, "/api/admin/medias?q=%EC%8B%A0%EC%B4%8C%EC%97%AD&take=5000");
});

test("buildAdminMediasListUrl — trims whitespace query", () => {
  const url = buildAdminMediasListUrl({ q: "  검암역  " });
  assert.match(url, /q=%EA%B2%80%EC%95%94%EC%97%AD/);
  assert.match(url, /take=5000/);
});
