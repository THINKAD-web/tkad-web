import type { DigitalChannel, DigitalChannelId } from "@/lib/planner/digital-channels";

/** Client-safe channel pool — no server/catalog fetch imports. */
export function resolveDigitalChannels(
  liveChannels?: DigitalChannel[] | null,
): DigitalChannel[] {
  return liveChannels?.length ? liveChannels : [];
}

export function getDigitalChannelFromList(
  id: DigitalChannelId,
  channels: DigitalChannel[],
): DigitalChannel | undefined {
  return channels.find((c) => c.id === id);
}
