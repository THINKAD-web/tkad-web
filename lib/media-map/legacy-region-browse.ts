/** URL·검색창 레거시 지역 칩 라벨 → browse regionMain/regionSub */
export const LEGACY_REGION_TO_BROWSE: Record<
  string,
  { regionMain: string; regionSub: string }
> = {
  강남: { regionMain: "seoul", regionSub: "seoul_gangnam" },
  홍대: { regionMain: "seoul", regionSub: "seoul_hongdae" },
  성수: { regionMain: "seoul", regionSub: "seoul_seongsu" },
  도심: { regionMain: "seoul", regionSub: "seoul_cbd" },
  부산: { regionMain: "busan", regionSub: "" },
  대구: { regionMain: "daegu", regionSub: "" },
};
