"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  COMMUNITY_INDUSTRY_OPTIONS,
  COMMUNITY_LIMITS,
  COMMUNITY_REGION_OPTIONS,
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityMemberRole,
  type CommunityCategory,
} from "@/lib/community/types";
import type { MediaItem } from "@/lib/media-data";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import { Send, Star } from "lucide-react";
import { RoleBadge } from "@/components/community/role-badge";

type Props = {
  locale: string;
  catalog: MediaItem[];
  currentUser: {
    name: string;
    company: string | null;
    role: string;
    communityRole: string | null;
  };
};

export function CommunityWriteForm({ locale, catalog, currentUser }: Props) {
  const router = useRouter();
  const isKo = locale === "ko";
  const isAdmin = currentUser.role === "admin";
  const [category, setCategory] = useState<CommunityCategory>("free");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [budgetWon, setBudgetWon] = useState("");
  const [region, setRegion] = useState("seoul_gangnam");
  const [industry, setIndustry] = useState("indFb");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberRole =
    normalizeCommunityMemberRole(currentUser.communityRole) ??
    fallbackCommunityRoleFromAppRole(currentUser.role);

  const visibleCategories = useMemo(
    () =>
      COMMUNITY_CATEGORIES.filter((c) => c !== "notice" || isAdmin),
    [isAdmin],
  );

  const titleOk =
    title.trim().length > 0 &&
    title.trim().length <= COMMUNITY_LIMITS.POST_TITLE_MAX;
  const bodyOk =
    body.trim().length >= COMMUNITY_LIMITS.POST_BODY_MIN &&
    body.trim().length <= COMMUNITY_LIMITS.POST_BODY_MAX;
  const recommendOk =
    category !== "media_recommend" ||
    (Number(budgetWon) > 0 && region && industry);
  const reviewOk =
    category !== "execution_review" || (selectedMedia != null && rating >= 1);
  const canSubmit = titleOk && bodyOk && recommendOk && reviewOk && !busy;

  const buildMetadata = () => {
    if (category === "media_recommend") {
      return {
        budgetWon: Math.round(Number(budgetWon)),
        region,
        industry,
      };
    }
    if (category === "execution_review" && selectedMedia) {
      return {
        mediaId: selectedMedia.id,
        mediaName: selectedMedia.name,
        rating,
      };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          body: body.trim(),
          metadata: buildMetadata(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
        pointsAwarded?: number;
      };
      if (!res.ok || !data.ok || !data.id) {
        setError(data.error || "글을 저장하지 못했습니다.");
        return;
      }
      router.push(`/community/post/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[26px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.55)] backdrop-blur tkad-neon-border">
        <p className="tkad-type-label dark:text-white text-gray-500">
          [ 작성자 ]
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-base font-bold dark:text-white text-gray-900">
            {currentUser.name}
          </span>
          <RoleBadge role={memberRole} locale={locale} />
          {currentUser.company ? (
            <span className="tkad-type-label dark:text-white">
              {currentUser.company}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <label className="block">
          <span className="tkad-type-label dark:text-white text-gray-500">
            [ 카테고리 ]
          </span>
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          {visibleCategories.map((cat) => {
            const labels = COMMUNITY_CATEGORY_LABELS[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`inline-flex min-w-[150px] flex-col items-start gap-1 rounded-[20px] border px-4 py-3 text-left tkad-type-label transition-colors ${ active ? "border-hermes/40 bg-hermes/15 dark:text-white text-gray-900 shadow-sm" : "dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-800 hover:dark:bg-white/10 bg-gray-100" }`}
              >
                <span>
                  {labels.emoji} {labels.ko}
                </span>
                <span
                  className={`tkad-type-note tracking-tight ${ active ? "dark:text-white text-gray-600" : "dark:text-white" }`}
                  style={{ textTransform: "none", letterSpacing: 0 }}
                >
                  {labels.description.ko}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {category === "media_recommend" ? (
        <div className="grid gap-4 rounded-[24px] border border-hermes/30 bg-hermes/10 p-5">
          <p className="tkad-type-title text-hermes">
            {isKo
              ? "AI 추천을 위해 아래 항목을 입력해주세요."
              : "Fill in the fields below for AI recommendations."}
          </p>
          <label className="block">
            <span className="tkad-type-title dark:text-white text-gray-700">
              {isKo ? "월 예산 (원)" : "Monthly budget (KRW)"}
            </span>
            <input
              type="number"
              min={100_000}
              step={100_000}
              value={budgetWon}
              onChange={(e) => setBudgetWon(e.target.value)}
              placeholder="1000000"
              required
              className="mt-2 w-full rounded-xl border dark:border-white/12 border-gray-200 px-4 py-2.5 text-sm dark:bg-white/6 bg-white"
            />
          </label>
          <label className="block">
            <span className="tkad-type-title dark:text-white text-gray-700">
              {isKo ? "희망 지역" : "Region"}
            </span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-2 w-full rounded-xl border dark:border-white/12 border-gray-200 px-4 py-2.5 text-sm dark:bg-white/6 bg-white"
            >
              {COMMUNITY_REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {isKo ? r.ko : r.en}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="tkad-type-title dark:text-white text-gray-700">
              {isKo ? "업종" : "Industry"}
            </span>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-2 w-full rounded-xl border dark:border-white/12 border-gray-200 px-4 py-2.5 text-sm dark:bg-white/6 bg-white"
            >
              {COMMUNITY_INDUSTRY_OPTIONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {isKo ? i.ko : i.en}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {category === "execution_review" ? (
        <div className="grid gap-4 rounded-[24px] border dark:border-emerald-400/30 border-emerald-200 dark:bg-emerald-500/5 bg-emerald-50/50 p-5">
          <p className="tkad-type-title dark:text-emerald-200 text-emerald-800">
            {isKo
              ? "집행 매체를 선택하면 매체 리뷰로도 등록되며 200P가 지급됩니다."
              : "Select the media — also posted as a review (+200P)."}
          </p>
          <div>
            <span className="tkad-type-title dark:text-white text-gray-700">
              {isKo ? "집행 매체" : "Media"}
            </span>
            <div className="mt-2">
              <MediaSearchAutocomplete
                catalog={catalog}
                locale={locale}
                onSelect={(m) => setSelectedMedia(m)}
                placeholder={isKo ? "매체명 검색…" : "Search media…"}
              />
            </div>
            {selectedMedia ? (
              <p className="mt-2 text-sm dark:text-white text-gray-700">
                ✓ {selectedMedia.name}
              </p>
            ) : null}
          </div>
          <div>
            <span className="tkad-type-title dark:text-white text-gray-700">
              {isKo ? "별점" : "Rating"}
            </span>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="rounded p-1"
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={`h-6 w-6 ${ n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300" }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <label className="block">
        <span className="tkad-type-label dark:text-white text-gray-500">
          [ 제목 ]
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          maxLength={COMMUNITY_LIMITS.POST_TITLE_MAX}
          required
          className="mt-3 w-full rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-3 text-base font-bold dark:text-white text-gray-900 placeholder:dark:text-white focus:border-white/22 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="tkad-type-label dark:text-white text-gray-500">
          [ 본문 ]
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          placeholder={
            category === "media_recommend"
              ? isKo
                ? "캠페인 목표, 희망 기간, 추가 조건 등을 적어주세요."
                : "Describe campaign goals, timing, and constraints."
              : category === "execution_review"
                ? isKo
                  ? "집행 기간, 성과, 아쉬운 점, 다음에 시도할 것 등을 적어주세요."
                  : "Share timing, results, lessons learned."
                : isKo
                  ? "본문을 입력해주세요."
                  : "Write your post."
          }
          maxLength={COMMUNITY_LIMITS.POST_BODY_MAX}
          required
          className="mt-3 w-full resize-y rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-4 text-sm dark:text-white text-gray-900 placeholder:dark:text-white focus:border-white/22 focus:outline-none"
        />
      </label>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute opacity-0 pointer-events-none"
        aria-hidden
      />

      {error ? (
        <p className="rounded-2xl border border-rose-400/35 bg-[rgba(127,29,29,0.24)] px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center gap-2 rounded-full border border-hermes/40 bg-hermes px-6 py-3 tkad-type-label text-white disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        {busy ? "전송 중…" : "글 등록"}
      </button>
    </form>
  );
}
