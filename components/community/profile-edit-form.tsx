"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { COMMUNITY_LIMITS } from "@/lib/community/types";

type Props = {
  userId: string;
  locale: string;
  initialName: string;
  initialCompany: string;
  initialBio: string;
  initialRegion: string;
};

const inputCls =
  "tkad-auth-input h-11 w-full rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/28 px-4  tkad-type-title dark:text-white text-gray-900 placeholder:dark:text-white outline-none backdrop-blur transition-ui focus:dark:border-white/18 border-gray-300 focus:ring-2 focus:ring-white/12";

export function CommunityProfileEditForm({
  userId,
  locale,
  initialName,
  initialCompany,
  initialBio,
  initialRegion,
}: Props) {
  const router = useRouter();
  const isKo = locale === "ko";
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [bio, setBio] = useState(initialBio);
  const [region, setRegion] = useState(initialRegion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/community/profile/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, bio, region }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(
          data.error ??
            (isKo ? "프로필을 저장하지 못했습니다." : "Could not save profile."),
        );
        return;
      }
      router.refresh();
    } catch {
      setError(isKo ? "네트워크 오류가 발생했습니다." : "A network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/25 p-5 backdrop-blur sm:p-6"
    >
      <p className="tkad-type-label dark:text-white text-gray-500">
        [ {isKo ? "프로필 수정" : "Edit profile"} ]
      </p>
      <p className="tkad-type-caption leading-relaxed dark:text-white">
        {isKo
          ? "// 역할(광고주·매체사 등)은 가입 시 설정된 값으로 고정됩니다."
          : "// Your community role is fixed from signup."}
      </p>

      <label className="block space-y-2">
        <span className="tkad-type-label dark:text-white text-gray-600">
          [ {isKo ? "이름" : "Name"} ]
        </span>
        <input
          className={inputCls}
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          maxLength={40}
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="tkad-type-label dark:text-white text-gray-600">
          [ {isKo ? "회사명" : "Company"} ]
        </span>
        <input
          className={inputCls}
          value={company}
          onChange={(ev) => setCompany(ev.target.value)}
          maxLength={80}
        />
      </label>

      <label className="block space-y-2">
        <span className="tkad-type-label dark:text-white text-gray-600">
          [ {isKo ? "한 줄 소개" : "Bio"} ]
        </span>
        <textarea
          className={`${inputCls} min-h-[88px] resize-none py-3`}
          value={bio}
          onChange={(ev) => setBio(ev.target.value)}
          maxLength={COMMUNITY_LIMITS.PROFILE_BIO_MAX}
          rows={3}
        />
        <span className="tkad-type-note dark:text-white">
          {bio.length} / {COMMUNITY_LIMITS.PROFILE_BIO_MAX}
        </span>
      </label>

      <label className="block space-y-2">
        <span className="tkad-type-label dark:text-white text-gray-600">
          [ {isKo ? "지역" : "Region"} ]
        </span>
        <input
          className={inputCls}
          value={region}
          onChange={(ev) => setRegion(ev.target.value)}
          maxLength={COMMUNITY_LIMITS.PROFILE_REGION_MAX}
          placeholder={isKo ? "예: 서울" : "e.g. Seoul"}
        />
      </label>

      {error ? (
        <div className="rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white/35 px-3 py-2 tkad-type-meta dark:text-white text-gray-800">
          {`// `}
          {error}
        </div>
      ) : null}

      <BtnBlock
        type="submit"
        variant="accent"
        size="lg"
        disabled={loading}
        className="w-full rounded-[22px] border dark:border-white/14 border-gray-200 bg-hermes dark:text-white text-white shadow-sm"
      >
        {loading && <Spinner size="sm" />}
        {loading ? (isKo ? "저장 중…" : "Saving…") : isKo ? "저장" : "Save"}
      </BtnBlock>
    </form>
  );
}
