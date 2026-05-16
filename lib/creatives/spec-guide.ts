/**
 * 크리에이티브 규격 가이드 데이터.
 *
 * `/[locale]/creatives/guide` 와 업로더의 매체별 권장 규격 안내에서 공통 사용.
 * 매체 디테일·즉시예약의 `creativeSpecGuide()` 는 매체 1건 기준 동적 텍스트,
 * 이 파일은 타입별 표준 가이드 표.
 */

export type CreativeFormat = "JPG" | "PNG" | "GIF" | "MP4" | "MOV";

export type CreativeSpecRow = {
  /** 매체 유형 키 (`MediaType` 그대로) */
  type: string;
  /** 한국어 라벨 */
  labelKo: string;
  /** 영어 라벨 */
  labelEn: string;
  /** 권장 해상도 (e.g. "1920×1080") */
  recommendedResolution: string;
  /** 권장 가로:세로 비율 */
  aspectRatio: string;
  /** 허용 정지 포맷 */
  stillFormats: CreativeFormat[];
  /** 허용 영상 포맷 (없으면 정지만) */
  videoFormats?: CreativeFormat[];
  /** 최대 파일 크기(MB) — UI 경고 임계 */
  maxFileMB: number;
  /** 영상 권장 길이 (초). 없으면 정지만 */
  videoDurationSec?: { min: number; max: number };
  /** 한국어 추가 메모 (여러 줄 가능) */
  notesKo: string[];
  /** 영어 추가 메모 */
  notesEn: string[];
};

const STILL_PHOTO: CreativeFormat[] = ["JPG", "PNG"];
const STILL_PHOTO_PLUS_GIF: CreativeFormat[] = ["JPG", "PNG", "GIF"];
const VIDEO_DEFAULT: CreativeFormat[] = ["MP4", "MOV"];

/**
 * `lib/media-data.ts` 의 `MediaType` 키마다 한 행씩.
 * 알려지지 않은 유형은 `default` 행으로 폴백.
 */
export const CREATIVE_SPECS: CreativeSpecRow[] = [
  {
    type: "billboard",
    labelKo: "옥외 빌보드 (LED)",
    labelEn: "Outdoor LED Billboard",
    recommendedResolution: "1920×1080 또는 매체별 패널 해상도",
    aspectRatio: "16:9 (가변)",
    stillFormats: STILL_PHOTO,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 100,
    videoDurationSec: { min: 10, max: 30 },
    notesKo: [
      "패널마다 실제 해상도가 다릅니다. 매체 상세 페이지의 `해상도` 항목을 확인해 주세요.",
      "원거리 시인성을 위해 텍스트 두께·콘트라스트를 충분히 확보하세요.",
      "야간 노출이 잦은 매체는 화이트 면적을 60% 이하로 권장합니다.",
    ],
    notesEn: [
      "Each panel has its own resolution. Check the media detail page.",
      "Use bold strokes and high contrast for long-distance readability.",
      "For panels that run heavily at night, keep white area below ~60%.",
    ],
  },
  {
    type: "led",
    labelKo: "LED 전광판",
    labelEn: "LED Display",
    recommendedResolution: "매체 권장 해상도 그대로",
    aspectRatio: "매체별 (가로/세로 모두 가능)",
    stillFormats: STILL_PHOTO,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 100,
    videoDurationSec: { min: 10, max: 30 },
    notesKo: [
      "픽셀 피치가 큰 LED는 디테일이 손실되므로 큰 그래픽·짧은 카피로 제작하세요.",
      "프레임률 30fps 이상을 권장합니다.",
    ],
    notesEn: [
      "Large-pitch LEDs lose detail — favor bold graphics and short copy.",
      "Recommend ≥30 fps.",
    ],
  },
  {
    type: "subway",
    labelKo: "지하철 (스크린/스크린도어/포스터)",
    labelEn: "Subway (screen / PSD / poster)",
    recommendedResolution: "디지털 1920×1080, 포스터는 매체별 mm 규격",
    aspectRatio: "16:9 또는 9:16",
    stillFormats: STILL_PHOTO_PLUS_GIF,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 80,
    videoDurationSec: { min: 10, max: 20 },
    notesKo: [
      "디지털 스크린은 무음 재생이므로 핵심 메시지가 자막/그래픽으로 전달돼야 합니다.",
      "스크린도어 출력물은 사방 10mm 재단여백을 두세요.",
    ],
    notesEn: [
      "Digital screens are muted; key message must read without audio.",
      "PSD prints should keep a 10mm bleed margin on all sides.",
    ],
  },
  {
    type: "bus",
    labelKo: "버스 (외부 래핑/내부 모니터)",
    labelEn: "Bus (exterior wrap / interior monitor)",
    recommendedResolution: "내부 모니터 1920×1080",
    aspectRatio: "16:9",
    stillFormats: STILL_PHOTO,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 80,
    videoDurationSec: { min: 10, max: 20 },
    notesKo: [
      "외부 래핑은 인쇄용 CMYK + 출고 사이즈(매체별)로 제출.",
      "내부 모니터는 좌석 거리 50~150cm 기준으로 가독성 확보.",
    ],
    notesEn: [
      "Exterior wraps need print-ready CMYK at the panel size.",
      "Interior monitors should be legible at ~50–150 cm viewing distance.",
    ],
  },
  {
    type: "taxi",
    labelKo: "택시 디지털 사이니지",
    labelEn: "Taxi Digital Signage",
    recommendedResolution: "1920×1080",
    aspectRatio: "16:9",
    stillFormats: STILL_PHOTO,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 60,
    videoDurationSec: { min: 10, max: 20 },
    notesKo: [
      "탑승자가 짧게 보는 환경 — 5초 안에 메시지가 보이도록 구성.",
      "흔들림에 강한 큰 글씨/심플 그래픽을 권장.",
    ],
    notesEn: [
      "Passengers glance briefly — deliver the message in the first 5 seconds.",
      "Use bold large type and simple graphics tolerant to motion.",
    ],
  },
  {
    type: "elevator",
    labelKo: "엘리베이터 모니터",
    labelEn: "Elevator Monitor",
    recommendedResolution: "1920×1080 (가로형) 또는 1080×1920 (세로형)",
    aspectRatio: "16:9 또는 9:16",
    stillFormats: STILL_PHOTO_PLUS_GIF,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 50,
    videoDurationSec: { min: 10, max: 15 },
    notesKo: [
      "체류 시간 5~30초 — 핵심 카피 1~2줄.",
      "근거리(1m 내외)에서 보는 화면이므로 디테일 표현 가능.",
    ],
    notesEn: [
      "Dwell time 5–30s — limit to 1–2 lines of headline copy.",
      "Viewed up close (~1 m), so finer details are fine.",
    ],
  },
  {
    type: "indoor",
    labelKo: "실내 사이니지 (카페·매장 등)",
    labelEn: "Indoor Signage (cafés, retail)",
    recommendedResolution: "1920×1080",
    aspectRatio: "16:9",
    stillFormats: STILL_PHOTO_PLUS_GIF,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 50,
    videoDurationSec: { min: 10, max: 15 },
    notesKo: [
      "무음 환경 — 자막 필수.",
      "조도가 밝은 환경이므로 명도 대비 60% 이상 권장.",
    ],
    notesEn: [
      "Muted environment — captions required.",
      "Bright ambient light — keep luminance contrast ≥60%.",
    ],
  },
  {
    type: "default",
    labelKo: "기타 / 알 수 없는 매체 유형",
    labelEn: "Other / Unknown",
    recommendedResolution: "1920×1080 (안전 기본값)",
    aspectRatio: "16:9",
    stillFormats: STILL_PHOTO_PLUS_GIF,
    videoFormats: VIDEO_DEFAULT,
    maxFileMB: 80,
    videoDurationSec: { min: 10, max: 30 },
    notesKo: ["매체 상세 페이지의 '해상도/규격' 항목을 우선 따라 주세요."],
    notesEn: ["Prefer the spec listed on the media detail page when available."],
  },
];

export function specRowForType(type: string | undefined | null): CreativeSpecRow {
  if (!type) return CREATIVE_SPECS[CREATIVE_SPECS.length - 1];
  const lower = type.toLowerCase();
  const match = CREATIVE_SPECS.find((r) => r.type === lower);
  return match ?? CREATIVE_SPECS[CREATIVE_SPECS.length - 1];
}

/** 전역 업로드 제한 (DB 비용 보호) — 어떤 유형이든 이것보다 클 수는 없음 */
export const CREATIVE_GLOBAL_MAX_BYTES = 150 * 1024 * 1024; // 150MB

export const CREATIVE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
] as const;

export const CREATIVE_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
] as const;

export const CREATIVE_ACCEPT_ATTR = [
  ...CREATIVE_IMAGE_MIME_TYPES,
  ...CREATIVE_VIDEO_MIME_TYPES,
].join(",");

export function classifyMime(mime: string): "image" | "video" | null {
  if ((CREATIVE_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return "image";
  if ((CREATIVE_VIDEO_MIME_TYPES as readonly string[]).includes(mime)) return "video";
  return null;
}

export type CreativeValidationIssue =
  | { code: "type_not_allowed"; message: string }
  | { code: "too_large"; message: string; limitMB: number }
  | { code: "too_long"; message: string; limitSec: number }
  | { code: "too_short"; message: string; limitSec: number };

export function validateCreativeBasics(args: {
  file: File;
  spec: CreativeSpecRow;
}): CreativeValidationIssue[] {
  const issues: CreativeValidationIssue[] = [];
  const kind = classifyMime(args.file.type);
  if (!kind) {
    issues.push({
      code: "type_not_allowed",
      message:
        "지원 형식이 아닙니다. 이미지(JPG/PNG/GIF) 또는 영상(MP4/MOV)만 업로드할 수 있습니다.",
    });
    return issues;
  }
  const limitBytes = Math.min(
    CREATIVE_GLOBAL_MAX_BYTES,
    args.spec.maxFileMB * 1024 * 1024,
  );
  if (args.file.size > limitBytes) {
    issues.push({
      code: "too_large",
      message: `매체 유형(${args.spec.labelKo}) 기준 권장 최대 ${args.spec.maxFileMB}MB 를 초과합니다.`,
      limitMB: args.spec.maxFileMB,
    });
  }
  return issues;
}
