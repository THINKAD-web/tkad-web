"use client";

import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Save } from "lucide-react";
import type { PlanCart } from "@/lib/plan-cart";
import type { SavedPlanCartReportSummary } from "@/lib/saved-plan-cart/types";
import { defaultSavedPlanTitle } from "@/lib/saved-plan-cart/types";
import { BtnBlock } from "@/components/brutalist";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { useAppToast } from "@/lib/use-toast";

type Props = {
  cart: PlanCart;
  isKo: boolean;
  source?: "plan_cart" | "plan_report";
  reportSummary?: SavedPlanCartReportSummary;
  variant?: "primary" | "secondary";
  className?: string;
  onSaved?: (id: string) => void;
  /** 저장 성공 후 저장된 플랜 목록으로 이동 */
  redirectAfterSave?: boolean;
};

export function SavePlanButton({
  cart,
  isKo,
  source = "plan_cart",
  reportSummary,
  variant = "secondary",
  className,
  onSaved,
  redirectAfterSave = false,
}: Props) {
  const router = useRouter();
  const toast = useAppToast();
  const { user } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const openDialog = useCallback(async () => {
    if (cart.items.length === 0) return;
    if (!user) {
      setNeedsLogin(true);
      setOpen(true);
      return;
    }
    setNeedsLogin(false);
    setTitle(defaultSavedPlanTitle(cart, isKo));
    setDescription("");
    setOpen(true);
  }, [cart, isKo, user]);

  async function handleSave() {
    if (cart.items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/my/plan/saved?locale=${isKo ? "ko" : "en"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            source,
            items: cart.items,
            campaignGoal: cart.campaignGoal,
            totalBudget: cart.totalBudget,
            duration: cart.duration,
            addonLines: cart.addonLines,
            updatedAt: cart.updatedAt,
            reportSummary,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg =
          data.error?.message ??
          (data.error?.code === "INVALID_INPUT"
            ? isKo
              ? "입력값을 확인해주세요."
              : "Please check your input."
            : undefined) ??
          "Save failed";
        throw new Error(msg);
      }
      toast.success(isKo ? "플랜을 저장했습니다." : "Plan saved.");
      setOpen(false);
      onSaved?.(data.data.id as string);
      if (redirectAfterSave) {
        router.push("/my/plan/saved");
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : isKo
            ? "저장에 실패했습니다."
            : "Could not save plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <BtnBlock
        type="button"
        variant={variant}
        className={className}
        onClick={() => void openDialog()}
        disabled={cart.items.length === 0}
      >
        <Save className="h-4 w-4" />
        {isKo ? "플랜 저장" : "Save plan"}
      </BtnBlock>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/12 dark:bg-[#12141c]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-plan-title"
          >
            <h2
              id="save-plan-title"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              {isKo ? "플랜 저장" : "Save plan"}
            </h2>

            {needsLogin ? (
              <p className="mt-3 text-sm text-gray-600 dark:text-white/70">
                {isKo
                  ? "저장하려면 로그인이 필요합니다."
                  : "Sign in to save your plan."}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">
                    {isKo ? "제목" : "Title"}
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-white/12 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-white/60">
                    {isKo ? "메모 (선택)" : "Note (optional)"}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/12 dark:bg-white/5 dark:text-white"
                    placeholder={
                      isKo
                        ? "사례·커뮤니티 활용 시 참고할 내용"
                        : "Notes for case study or community use"
                    }
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-white/50">
                  {isKo
                    ? `매체 ${cart.items.length}개 · 저장 후 「저장한 플랜」에서 불러오거나 삭제할 수 있습니다.`
                    : `${cart.items.length} media · Restore or delete from Saved plans.`}
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <BtnBlock
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                {isKo ? "취소" : "Cancel"}
              </BtnBlock>
              {needsLogin ? (
                <BtnBlock variant="accent" href="/login">
                  {isKo ? "로그인" : "Sign in"}
                </BtnBlock>
              ) : (
                <BtnBlock
                  type="button"
                  variant="accent"
                  onClick={() => void handleSave()}
                  disabled={saving || !title.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isKo ? "저장" : "Save"}
                </BtnBlock>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
