import localFont from "next/font/local";

/** UI 본문·디스플레이 — variable subset, display:swap */
export const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  preload: true,
  weight: "100 900",
});
