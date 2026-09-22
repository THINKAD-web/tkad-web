export type ContractInviteSendKind = "initial" | "resend";

export type ContractInviteSendEntry = {
  sentAt: string;
  to: string;
  kind: ContractInviteSendKind;
};

export function parseContractInviteSendLog(
  raw: unknown,
): ContractInviteSendEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ContractInviteSendEntry[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as ContractInviteSendEntry).sentAt === "string" &&
      typeof (item as ContractInviteSendEntry).to === "string" &&
      ((item as ContractInviteSendEntry).kind === "initial" ||
        (item as ContractInviteSendEntry).kind === "resend")
    ) {
      out.push(item as ContractInviteSendEntry);
    }
  }
  return out;
}

export function appendContractInviteSendLog(
  existing: unknown,
  entry: ContractInviteSendEntry,
): ContractInviteSendEntry[] {
  return [...parseContractInviteSendLog(existing), entry];
}
