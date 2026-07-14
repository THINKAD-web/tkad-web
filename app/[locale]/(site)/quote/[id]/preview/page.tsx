"use client";

import { useParams } from "next/navigation";
import QuotePreviewView from "@/components/quote/quote-preview-view";

export default function QuotePreviewPage() {
  const params = useParams<{ id: string }>();
  return <QuotePreviewView quoteId={params.id} showProceedCta />;
}
