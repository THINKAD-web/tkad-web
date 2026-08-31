"use client";

/**
 * PR-6c L-1/L-2 — 플래너 세션·브리프 변경 확인 모달.
 */

import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function BriefResumeDialog({
  open,
  mixCount,
  isKo,
  onContinue,
  onFreshStart,
}: {
  open: boolean;
  mixCount: number;
  isKo: boolean;
  onContinue: () => void;
  onFreshStart: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onContinue}
      locked
      ariaLabel={isKo ? "이전 작업 이어하기" : "Resume previous work"}
      className="max-w-md"
    >
      <div className="relative p-6 pt-10 sm:p-8">
        <h2 className="tkad-type-price text-lg sm:text-xl">
          {isKo ? "이전에 담아두신 매체가 있습니다" : "You have media from last time"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isKo
            ? `지난번에 담아두신 매체 ${mixCount}개가 있습니다. 이어서 진행할까요, 새로 시작할까요?`
            : `${mixCount} media from your last session. Continue or start fresh?`}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1" onClick={onContinue}>
            {isKo ? "이어서 진행" : "Continue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onFreshStart}
          >
            {isKo ? "새로 시작" : "Start fresh"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function BriefMixStaleDialog({
  open,
  isKo,
  onKeepMix,
  onRebuildMix,
}: {
  open: boolean;
  isKo: boolean;
  onKeepMix: () => void;
  onRebuildMix: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onKeepMix}
      ariaLabel={isKo ? "브리프 변경 확인" : "Brief changed confirmation"}
      className="max-w-md"
    >
      <div className="relative p-6 pt-10 sm:p-8">
        <h2 className="tkad-type-price text-lg sm:text-xl">
          {isKo ? "브리프 조건이 바뀌었습니다" : "Your brief has changed"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isKo
            ? "예산·지역·타깃·업종 등 핵심 조건이 이전과 다릅니다. 새 조건에 맞춰 매체 구성을 다시 추천해드릴까요?"
            : "Core brief fields differ from when you built the mix. Rebuild recommendations for the new conditions?"}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="flex-1" onClick={onKeepMix}>
            {isKo ? "유지" : "Keep mix"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onRebuildMix}
          >
            {isKo ? "다시 추천받기" : "Rebuild mix"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
