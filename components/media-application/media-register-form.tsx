"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import {
  DaumAddressSearch,
  type DaumAddressResult,
} from "@/components/media-application/daum-address-search";
import { PhotoSlotUpload } from "@/components/media-application/photo-slot-upload";
import { TurnstileWidget } from "@/components/turnstile";
import { MEDIA_APPLICATION_MEDIA_TYPES } from "@/lib/media-application";

const inputCls =
  "h-11 w-full rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 text-sm dark:text-white text-gray-900 placeholder:dark:text-white text-gray-400 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30";
const labelCls =
  "block font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-500";
const sectionTitleCls =
  "font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-800";

export function MediaRegisterForm() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const outreachToken = searchParams.get("ot")?.trim() ?? "";
  const referralRef = searchParams.get("ref")?.trim() ?? "";

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [mediaType, setMediaType] = useState<string>("digital");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [isDigital, setIsDigital] = useState(true);
  const [operatingHours, setOperatingHours] = useState("");
  const [hasLighting, setHasLighting] = useState(false);
  const [dailyFootfall, setDailyFootfall] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [minFlightDays, setMinFlightDays] = useState("");
  const [photoFrontUrl, setPhotoFrontUrl] = useState("");
  const [photoSideUrl, setPhotoSideUrl] = useState("");
  const [photoNightUrl, setPhotoNightUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  const onAddress = (r: DaumAddressResult) => {
    setAddress(r.address);
    setZonecode(r.zonecode);
    setCity(r.city);
    setDistrict(r.district);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/media-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          companyName,
          contactName,
          contactPhone,
          contactEmail,
          mediaName,
          mediaType,
          address,
          addressDetail,
          zonecode,
          city,
          district,
          widthCm: widthCm ? Number(widthCm) : null,
          heightCm: heightCm ? Number(heightCm) : null,
          isDigital,
          operatingHours,
          hasLighting,
          dailyFootfall: dailyFootfall ? Number(dailyFootfall) : null,
          monthlyPrice: Number(monthlyPrice),
          minFlightDays: minFlightDays ? Number(minFlightDays) : null,
          photoFrontUrl,
          photoSideUrl,
          photoNightUrl,
          notes,
          ...(outreachToken ? { outreachToken } : {}),
          ...(referralRef ? { referralRef } : {}),
          turnstileToken: captchaToken || undefined,
        }),
      });
      const text = await res.text();
      let data: { id?: string; error?: string; fields?: string[] } = {};
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error(
          isKo
            ? "서버 응답 오류입니다. 잠시 후 다시 시도해 주세요."
            : "Server response error. Please try again.",
        );
      }
      if (!res.ok) {
        if (data.error === "database_error") {
          throw new Error(
            isKo
              ? "접수 저장에 실패했습니다. 잠시 후 다시 시도하거나 문의해 주세요."
              : "Could not save your application. Please try again or contact us.",
          );
        }
        if (data.fields?.length) {
          throw new Error(
            isKo
              ? `입력을 확인해 주세요: ${data.fields.join(", ")}`
              : `Check fields: ${data.fields.join(", ")}`,
          );
        }
        throw new Error(data.error ?? "Submit failed");
      }
      setSuccessId(data.id ?? "ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-10 text-center backdrop-blur">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
          [ {isKo ? "접수 완료" : "Submitted"} ]
        </p>
        <h2 className="mt-4 text-2xl font-black dark:text-white text-gray-900">
          {isKo ? "매체 등록 신청이 접수되었습니다" : "Application received"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed dark:text-white text-gray-700">
          {isKo
            ? "심사 후 담당자 이메일로 결과를 안내드립니다. 영업일 기준 수일이 소요될 수 있습니다."
            : "We will email you after review."}
        </p>
        <p className="mt-6 text-[10px] dark:text-white">ID: {successId}</p>
        <Link
          href="/"
          className="tkad-neon-cta-clean mt-8 inline-flex items-center justify-center rounded-2xl px-8 py-3 font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-900"
        >
          {isKo ? "홈으로" : "Home"}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {error ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>
          1. {isKo ? "신청자 정보" : "Applicant"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 sm:col-span-2">
            <span className={labelCls}>{isKo ? "회사명" : "Company"}</span>
            <input
              required
              className={inputCls}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>{isKo ? "담당자명" : "Contact name"}</span>
            <input
              required
              className={inputCls}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>{isKo ? "연락처" : "Phone"}</span>
            <input
              required
              type="tel"
              className={inputCls}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className={labelCls}>{isKo ? "이메일" : "Email"}</span>
            <input
              required
              type="email"
              className={inputCls}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>
          2. {isKo ? "매체 기본 정보" : "Media basics"}
        </h2>
        <label className="grid gap-1">
          <span className={labelCls}>{isKo ? "매체명" : "Media name"}</span>
          <input
            required
            className={inputCls}
            value={mediaName}
            onChange={(e) => setMediaName(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className={labelCls}>{isKo ? "유형" : "Type"}</span>
          <select
            className={inputCls}
            value={mediaType}
            onChange={(e) => {
              setMediaType(e.target.value);
              setIsDigital(e.target.value === "digital");
            }}
          >
            {MEDIA_APPLICATION_MEDIA_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#0a0a0f] dark:text-white text-gray-900">
                {t === "digital"
                  ? isKo
                    ? "디지털"
                    : "Digital"
                  : t === "static"
                    ? isKo
                      ? "고정형"
                      : "Static"
                    : isKo
                      ? "기타"
                      : "Other"}
              </option>
            ))}
          </select>
        </label>
        <DaumAddressSearch
          isKo={isKo}
          value={address}
          onChange={onAddress}
          disabled={submitting}
        />
        <label className="grid gap-1">
          <span className={labelCls}>
            {isKo ? "상세 주소 (동·호수)" : "Address detail"}
          </span>
          <input
            className={inputCls}
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>
          3. {isKo ? "매체 스펙" : "Specs"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={labelCls}>
              {isKo ? "가로 (cm)" : "Width (cm)"}
            </span>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>
              {isKo ? "세로 (cm)" : "Height (cm)"}
            </span>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm dark:text-white text-gray-700">
          <input
            type="checkbox"
            className="rounded dark:border-white/20 border-gray-300"
            checked={isDigital}
            onChange={(e) => setIsDigital(e.target.checked)}
          />
          {isKo ? "디지털 송출 매체" : "Digital screen"}
        </label>
        <label className="grid gap-1">
          <span className={labelCls}>
            {isKo ? "운영 시간" : "Operating hours"}
          </span>
          <input
            className={inputCls}
            placeholder={isKo ? "예: 06:00–24:00" : "e.g. 06:00–24:00"}
            value={operatingHours}
            onChange={(e) => setOperatingHours(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm dark:text-white text-gray-700">
          <input
            type="checkbox"
            className="rounded dark:border-white/20 border-gray-300"
            checked={hasLighting}
            onChange={(e) => setHasLighting(e.target.checked)}
          />
          {isKo ? "조명 있음" : "Lighting available"}
        </label>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>
          4. {isKo ? "노출 데이터" : "Exposure"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={labelCls}>
              {isKo ? "일 평균 유동 (추정)" : "Daily footfall (est.)"}
            </span>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={dailyFootfall}
              onChange={(e) => setDailyFootfall(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>
              {isKo ? "월 집행 단가 (원)" : "Monthly price (KRW)"}
            </span>
            <input
              required
              type="number"
              min={0}
              className={inputCls}
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className={labelCls}>
              {isKo ? "최소 집행 기간 (일)" : "Min flight (days)"}
            </span>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={minFlightDays}
              onChange={(e) => setMinFlightDays(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>
          5. {isKo ? "사진 (각 1장 이상)" : "Photos"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <PhotoSlotUpload
            slot="front"
            label={isKo ? "정면" : "Front"}
            hint={isKo ? "매체 전체가 보이는 사진" : "Full front view"}
            value={photoFrontUrl}
            onChange={setPhotoFrontUrl}
            disabled={submitting}
          />
          <PhotoSlotUpload
            slot="side"
            label={isKo ? "측면" : "Side"}
            hint={isKo ? "측면·거리감" : "Side angle"}
            value={photoSideUrl}
            onChange={setPhotoSideUrl}
            disabled={submitting}
          />
          <PhotoSlotUpload
            slot="night"
            label={isKo ? "야경" : "Night"}
            hint={isKo ? "야간 조명 상태" : "Night lighting"}
            value={photoNightUrl}
            onChange={setPhotoNightUrl}
            disabled={submitting}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitleCls}>
          6. {isKo ? "추가 특이사항" : "Notes"}
        </h2>
        <textarea
          rows={5}
          className={inputCls}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            isKo
              ? "제작 규격, 협의 가능 일정 등"
              : "Specs, availability, etc."
          }
        />
      </section>

      <TurnstileWidget onVerify={setCaptchaToken} className="mb-2" />

      <button
        type="submit"
        disabled={
          submitting ||
          !photoFrontUrl ||
          !photoSideUrl ||
          !photoNightUrl ||
          !address
        }
        className="tkad-neon-cta-clean inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-900 transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto sm:min-w-[14rem] sm:px-12"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isKo ? "등록 신청 제출" : "Submit application"}
      </button>
    </form>
  );
}
