import { postInternalAlert } from "@/lib/internal-webhook";

export type PublishedContentShare = {
  kind: "trend_report" | "education_article" | "guide_article";
  title: string;
  publicUrl: string;
};

/** 발행 시 SNS·채널 공유용 웹훅 (Instagram/카카오는 Zapier·Make 연동) */
export async function notifyPublishedContentSns(item: PublishedContentShare) {
  const instagramHook = process.env.SNS_INSTAGRAM_WEBHOOK_URL?.trim();
  const kakaoHook = process.env.SNS_KAKAO_WEBHOOK_URL?.trim();

  const payload = {
    type: "content_published",
    title: item.title,
    url: item.publicUrl,
    kind: item.kind,
    channels: ["instagram", "kakao"],
  };

  await postInternalAlert({
    type: "content_published",
    title: `콘텐츠 발행 · ${item.title}`,
    body: item.publicUrl,
    meta: payload,
  }).catch(() => {});

  const hooks = [
    { url: instagramHook, channel: "instagram" },
    { url: kakaoHook, channel: "kakao" },
  ].filter((h) => h.url);

  for (const { url, channel } of hooks) {
    try {
      await fetch(url!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, channel }),
      });
    } catch (e) {
      console.error("[sns-share]", channel, e);
    }
  }
}
