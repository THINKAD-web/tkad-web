import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { caseStudies } from "@/lib/case-studies";

export const alt = "THINKAD 케이스 스터디";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = caseStudies.find((c) => c.slug === slug);

  return new ImageResponse(
    (
      <OgLayout
        badge={cs?.category ?? "Case Study"}
        title={cs?.title ?? "OOH 광고 성공 사례"}
        subtitle={cs?.results}
      />
    ),
    { ...size }
  );
}
