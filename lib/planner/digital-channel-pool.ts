import {
  DIGITAL_CHANNELS,
  type DigitalChannel,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";

/** Client-safe channel pool — no server/catalog fetch imports. */
export function resolveDigitalChannels(
  liveChannels?: DigitalChannel[] | null,
): DigitalChannel[] {
  if (liveChannels?.length) return liveChannels;
  return DIGITAL_CHANNELS;
}

export function getDigitalChannelFromList(
  id: DigitalChannelId,
  channels: DigitalChannel[],
): DigitalChannel | undefined {
  return channels.find((c) => c.id === id);
}
