import assert from "node:assert/strict";
import {
  adminNetworkSearchHaystack,
  filterAdminNetworks,
  matchesNetworkPublicFilter,
  matchesNetworkTypeFilter,
  toAdminNetworkListRow,
} from "../lib/admin-network-list.ts";

const sample = toAdminNetworkListRow({
  id: "n1",
  name: "강남 버스쉘터",
  nameEn: "Gangnam Bus",
  type: "bus_shelter",
  tags: ["venue:bus_shelter"],
  totalLocations: 10,
  regions: ["seoul", "seoul_gangnam"],
  pricePackage: 500,
  isActive: true,
  updatedAt: "2026-01-15T00:00:00.000Z",
  _count: { locations: 2 },
  locations: [{ name: "강남역 1번 출구" }, { name: "역삼역" }],
});

assert.ok(adminNetworkSearchHaystack(sample).includes("강남역"));
assert.ok(adminNetworkSearchHaystack(sample).includes("역삼역"));

assert.equal(matchesNetworkTypeFilter(sample, "mobile"), true);
assert.equal(matchesNetworkTypeFilter(sample, "digital"), false);

assert.equal(matchesNetworkPublicFilter(sample, "public"), true);
assert.equal(matchesNetworkPublicFilter({ ...sample, isActive: false }, "hidden"), true);

const filtered = filterAdminNetworks(
  [
    sample,
    {
      ...sample,
      id: "n2",
      name: "편의점 네트워크",
      type: "digital",
      tags: [],
      locationNames: ["홍대입구"],
    },
  ],
  { search: "강남역", typeFilter: "all", publicFilter: "all" },
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]!.id, "n1");

console.log("admin-network-list: ok");
