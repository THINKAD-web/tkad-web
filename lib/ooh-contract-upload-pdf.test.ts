import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCloudinaryPublicId } from "@/lib/campaign-proof-cloudinary";

describe("ooh-contract-upload-pdf cloudinary ids", () => {
  it("parseCloudinaryPublicId handles raw contract URLs", () => {
    const url =
      "https://res.cloudinary.com/demo/raw/upload/v1234567890/tkad/contracts/source_abc123.pdf";
    assert.equal(parseCloudinaryPublicId(url), "tkad/contracts/source_abc123");
  });
});
