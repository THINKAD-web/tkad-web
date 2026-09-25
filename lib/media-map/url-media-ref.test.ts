import assert from "node:assert/strict";
import {
  mapItemMatchesUrlMediaRef,
  mapItemToUrlMediaRef,
} from "@/lib/media-map/url-media-ref";

assert.equal(
  mapItemToUrlMediaRef({ id: "cmuid123", slug: "my-slug" }),
  "my-slug",
);
assert.equal(mapItemToUrlMediaRef({ id: "cmuid123" }), "cmuid123");
assert.equal(
  mapItemMatchesUrlMediaRef({ id: "cmuid123", slug: "my-slug" }, "my-slug"),
  true,
);
assert.equal(
  mapItemMatchesUrlMediaRef({ id: "cmuid123", slug: "my-slug" }, "cmuid123"),
  true,
);

console.log("url-media-ref.test.ts: ok");
