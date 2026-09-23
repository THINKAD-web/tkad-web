import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendContractInviteSendLog,
  parseContractInviteSendLog,
} from "@/lib/contract-invite-log";

describe("contract-invite-log", () => {
  it("parseContractInviteSendLog rejects invalid entries", () => {
    assert.deepEqual(parseContractInviteSendLog(null), []);
    assert.deepEqual(parseContractInviteSendLog([{ sentAt: "x" }]), []);
    assert.deepEqual(
      parseContractInviteSendLog([
        { sentAt: "2026-01-01T00:00:00.000Z", to: "a@b.co", kind: "initial" },
        { sentAt: "2026-01-02T00:00:00.000Z", to: "x", kind: "unknown" },
      ]),
      [
        {
          sentAt: "2026-01-01T00:00:00.000Z",
          to: "a@b.co",
          kind: "initial",
        },
      ],
    );
  });

  it("appendContractInviteSendLog appends in order", () => {
    const first = {
      sentAt: "2026-01-01T00:00:00.000Z",
      to: "a@b.co",
      kind: "initial" as const,
    };
    const second = {
      sentAt: "2026-01-02T00:00:00.000Z",
      to: "a@b.co",
      kind: "resend" as const,
    };
    const log = appendContractInviteSendLog([first], second);
    assert.equal(log.length, 2);
    assert.equal(log[1]?.kind, "resend");
  });

  it("parseContractInviteSendLog accepts attachment kinds", () => {
    const log = parseContractInviteSendLog([
      {
        sentAt: "2026-01-01T00:00:00.000Z",
        to: "a@b.co",
        kind: "attachment_initial",
      },
    ]);
    assert.equal(log[0]?.kind, "attachment_initial");
  });
});
