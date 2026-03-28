"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Spinner from "@/components/spinner";
import { useToast } from "@/components/toast-provider";

export type LeadData = {
  company: string;
  name: string;
  email: string;
};

type LeadCaptureModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LeadData) => void;
  title?: string;
  description?: string;
  locale?: string;
};

export function LeadCaptureModal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  locale = "ko",
}: LeadCaptureModalProps) {
  const isKo = locale === "ko";
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setCompany("");
      setName("");
      setEmail("");
    }
  }, [open]);

  const displayTitle =
    title ??
    (isKo ? "자료 받기" : "Get the resource");
  const displayDescription =
    description ??
    (isKo
      ? "정보를 입력하시면 자료를 보내드립니다."
      : "Enter your details and we will send you the materials.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      onSubmit({ company, name, email });
      setSubmitted(true);
      toast("success", isKo ? "접수되었습니다!" : "Submitted successfully!");
      window.setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } catch {
      toast("error", isKo ? "일시적 오류가 발생했습니다." : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={submitted}
      ariaLabelledBy="lead-capture-modal-title"
      className="max-w-md"
    >
      <div className="p-6">
        {submitted ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 ring-2 ring-gold/30">
              <CheckCircle className="h-8 w-8 text-gold-dark" />
            </div>
            <h3
              id="lead-capture-modal-title"
              className="text-xl font-bold text-navy"
            >
              {isKo ? "접수되었습니다!" : "You are all set!"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isKo
                ? "입력하신 이메일로 자료를 보내드립니다."
                : "We will send the materials to the email you provided."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold-dark">
                <Download className="h-3.5 w-3.5" />
                {isKo ? "자료 다운로드" : "Download"}
              </div>
              <h3
                id="lead-capture-modal-title"
                className="text-xl font-bold text-navy"
              >
                {displayTitle}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {displayDescription}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <Input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={isKo ? "회사명" : "Company"}
                autoComplete="organization"
                className="h-11 border-slate-200 focus:border-gold focus:ring-gold/20"
              />
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isKo ? "담당자명" : "Contact name"}
                autoComplete="name"
                className="h-11 border-slate-200 focus:border-gold focus:ring-gold/20"
              />
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isKo ? "이메일" : "Email"}
                autoComplete="email"
                className="h-11 border-slate-200 focus:border-gold focus:ring-gold/20"
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gold font-bold text-navy text-sm hover:bg-gold-dark"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    {isKo ? "전송 중..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {isKo ? "자료 받기" : "Get the download"}
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
