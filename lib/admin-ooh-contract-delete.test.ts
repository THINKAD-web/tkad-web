import assert from "node:assert/strict";
import { test } from "node:test";
import { OohContractStatus } from "@prisma/client";
import {
  AdminContractDeleteError,
  deleteAdminOohContractByContractId,
} from "./admin-ooh-contract-delete.ts";

test("deleteAdminOohContractByContractId: signed requires acknowledgeSigned", async () => {
  const db = {
    oohContract: {
      findUnique: async () => ({
        id: "c1",
        status: OohContractStatus.signed,
        ooHQuote: { id: "q1", status: "booking_confirmed", campaignId: null },
      }),
    },
  };

  await assert.rejects(
    () =>
      deleteAdminOohContractByContractId(db as never, "c1", {
        acknowledgeSigned: false,
      }),
    (e: unknown) =>
      e instanceof AdminContractDeleteError &&
      e.code === "signed_requires_ack",
  );
});
