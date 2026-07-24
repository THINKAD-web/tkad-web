import assert from "node:assert/strict";
import test from "node:test";
import { buildStructuredDataGraph } from "@/lib/structured-data";
import { serializeJsonLd } from "@/lib/seo";

type GraphNode = {
  "@type"?: string;
  "@id"?: string;
  description?: string;
  provider?: { "@id"?: string };
  offers?: { "@type"?: string; price?: number; priceCurrency?: string };
  aggregateRating?: unknown;
  review?: unknown;
};

function graphNodes(locale: string): GraphNode[] {
  const data = buildStructuredDataGraph(locale) as {
    "@graph": GraphNode[];
  };
  return data["@graph"];
}

test("buildStructuredDataGraph serializes to valid JSON-LD for ko and en", () => {
  for (const locale of ["ko", "en"] as const) {
    const data = buildStructuredDataGraph(locale);
    const html = serializeJsonLd(data);
    assert.doesNotThrow(() => JSON.parse(html));
    const parsed = JSON.parse(html) as {
      "@context": string;
      "@graph": GraphNode[];
    };
    assert.equal(parsed["@context"], "https://schema.org");
    assert.ok(Array.isArray(parsed["@graph"]));
    assert.ok(parsed["@graph"].length >= 4);
  }
});

test("Organization keeps @id and drops agency / No.1 wording", () => {
  const org = graphNodes("ko").find((n) => n["@type"] === "Organization");
  assert.ok(org);
  assert.match(org["@id"] ?? "", /#organization$/);
  assert.ok(org.description);
  assert.doesNotMatch(org.description, /에이전시|agency|No\.?\s*1/i);
  assert.match(org.description, /플랫폼|OOH/);
});

test("WebApplication is linked to Organization via provider and has free KRW offer", () => {
  const nodes = graphNodes("ko");
  const org = nodes.find((n) => n["@type"] === "Organization");
  const app = nodes.find((n) => n["@type"] === "WebApplication");
  assert.ok(org);
  assert.ok(app);
  assert.match(app["@id"] ?? "", /#webapp$/);
  assert.equal(app.provider?.["@id"], org["@id"]);
  assert.equal(app.offers?.["@type"], "Offer");
  assert.equal(app.offers?.price, 0);
  assert.equal(app.offers?.priceCurrency, "KRW");
  assert.equal(app.aggregateRating, undefined);
  assert.equal(app.review, undefined);
});
