import type { Metadata } from "next";
import { OfflineClient } from "./offline-client";

export const metadata: Metadata = {
  title: "오프라인 | THINKAD",
  description: "네트워크 연결을 확인해주세요.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineClient />;
}
