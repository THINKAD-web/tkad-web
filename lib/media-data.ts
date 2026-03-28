export interface MediaItem {
  id: number;
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  region: string;
  type: string;
  price: number;
  dailyExposure?: string;
  features?: string;
  featuresEn?: string;
}

export const mediaData: MediaItem[] = [
  { id: 1, name: "강남역 대형 빌보드", nameEn: "Gangnam Station Large Billboard", location: "서울 강남구", locationEn: "Gangnam-gu, Seoul", region: "seoul", type: "billboard", price: 2500, dailyExposure: "320,000", features: "유동인구 A+, 24시간 조명", featuresEn: "Traffic A+, 24h illumination" },
  { id: 2, name: "코엑스 디지털 사이니지", nameEn: "COEX Digital Signage", location: "서울 삼성동", locationEn: "Samsung-dong, Seoul", region: "seoul", type: "digital", price: 3800, dailyExposure: "280,000", features: "HD 화질, 15초 롤링", featuresEn: "HD quality, 15s rolling" },
  { id: 3, name: "홍대입구역 지하철 광고", nameEn: "Hongdae Station Subway Ad", location: "서울 마포구", locationEn: "Mapo-gu, Seoul", region: "seoul", type: "subway", price: 1200, dailyExposure: "210,000", features: "스크린도어 광고, 양방향", featuresEn: "Screen door ad, bidirectional" },
  { id: 4, name: "명동 대형 전광판", nameEn: "Myeongdong Large LED", location: "서울 중구", locationEn: "Jung-gu, Seoul", region: "seoul", type: "digital", price: 4200, dailyExposure: "350,000", features: "4K LED, 관광객 밀집", featuresEn: "4K LED, tourist hotspot" },
  { id: 5, name: "잠실 롯데월드타워 빌보드", nameEn: "Lotte World Tower Billboard", location: "서울 송파구", locationEn: "Songpa-gu, Seoul", region: "seoul", type: "billboard", price: 5000, dailyExposure: "400,000", features: "랜드마크 위치, 고급 이미지", featuresEn: "Landmark location, premium image" },
  { id: 6, name: "서면역 디지털 스크린", nameEn: "Seomyeon Station Digital Screen", location: "부산 부산진구", locationEn: "Busanjin-gu, Busan", region: "busan", type: "digital", price: 1500, dailyExposure: "120,000", features: "부산 핵심 상권", featuresEn: "Busan core commercial area" },
  { id: 7, name: "해운대 해변 빌보드", nameEn: "Haeundae Beach Billboard", location: "부산 해운대구", locationEn: "Haeundae-gu, Busan", region: "busan", type: "billboard", price: 1800, dailyExposure: "150,000", features: "해변 노출, 관광지", featuresEn: "Beach exposure, tourist area" },
  { id: 8, name: "부산역 지하철 광고", nameEn: "Busan Station Subway Ad", location: "부산 동구", locationEn: "Dong-gu, Busan", region: "busan", type: "subway", price: 900, dailyExposure: "95,000", features: "KTX 환승역", featuresEn: "KTX transfer station" },
  { id: 9, name: "제주공항 디지털 광고", nameEn: "Jeju Airport Digital Ad", location: "제주시", locationEn: "Jeju City", region: "jeju", type: "digital", price: 2200, dailyExposure: "180,000", features: "공항 이용객 타겟", featuresEn: "Airport traveler target" },
  { id: 10, name: "제주 중문관광단지 빌보드", nameEn: "Jungmun Resort Billboard", location: "서귀포시", locationEn: "Seogwipo City", region: "jeju", type: "billboard", price: 1000, dailyExposure: "60,000", features: "관광단지 중심", featuresEn: "Resort center" },
  { id: 11, name: "강남대로 버스 쉘터", nameEn: "Gangnam-daero Bus Shelter", location: "서울 강남구", locationEn: "Gangnam-gu, Seoul", region: "seoul", type: "bus", price: 800, dailyExposure: "85,000", features: "대로변 위치", featuresEn: "Main road location" },
  { id: 12, name: "을지로 지하철 랩핑", nameEn: "Euljiro Subway Wrapping", location: "서울 중구", locationEn: "Jung-gu, Seoul", region: "seoul", type: "subway", price: 2000, dailyExposure: "190,000", features: "전체 랩핑, 높은 시인성", featuresEn: "Full wrapping, high visibility" },
  { id: 13, name: "전국 고속도로 빌보드", nameEn: "National Highway Billboard", location: "전국", locationEn: "Nationwide", region: "national", type: "billboard", price: 3500, dailyExposure: "500,000", features: "전국 커버리지", featuresEn: "Nationwide coverage" },
  { id: 14, name: "전국 시내버스 광고", nameEn: "National City Bus Ad", location: "전국", locationEn: "Nationwide", region: "national", type: "bus", price: 600, dailyExposure: "1,000,000", features: "이동형 광고, 전국 노출", featuresEn: "Mobile ad, nationwide exposure" },
  { id: 15, name: "여의도 IFC 디지털", nameEn: "Yeouido IFC Digital", location: "서울 영등포구", locationEn: "Yeongdeungpo-gu, Seoul", region: "seoul", type: "digital", price: 3200, dailyExposure: "250,000", features: "금융가 타겟, 프리미엄", featuresEn: "Financial district, premium" },
];

export const typeLabels: Record<string, { ko: string; en: string }> = {
  billboard: { ko: "빌보드", en: "Billboard" },
  digital: { ko: "디지털", en: "Digital" },
  subway: { ko: "지하철", en: "Subway" },
  bus: { ko: "버스", en: "Bus" },
};
