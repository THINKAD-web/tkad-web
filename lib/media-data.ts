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
  { id: 1, name: "코엑스 K-POP 스퀘어 전광판", nameEn: "COEX K-POP Square LED", location: "서울 삼성동 코엑스", locationEn: "COEX, Samsung-dong, Seoul", region: "seoul", type: "digital", price: 5000, dailyExposure: "500,000", features: "국내 최대 옥외 LED, K-POP 명소", featuresEn: "Korea's largest outdoor LED, K-POP landmark" },
  { id: 2, name: "강남대로 미디어폴 G-LIGHT", nameEn: "Gangnam-daero Media Pole G-LIGHT", location: "서울 강남구 강남대로", locationEn: "Gangnam-daero, Gangnam-gu, Seoul", region: "seoul", type: "digital", price: 3500, dailyExposure: "320,000", features: "강남 핵심 상권, 미디어폴 네트워크", featuresEn: "Gangnam core district, media pole network" },
  { id: 3, name: "코엑스 9to9 나인투나인 CUBE", nameEn: "COEX 9to9 CUBE", location: "서울 삼성동 코엑스몰", locationEn: "COEX Mall, Samsung-dong, Seoul", region: "seoul", type: "digital", price: 3800, dailyExposure: "280,000", features: "코엑스몰 내부 큐브형 디지털", featuresEn: "COEX Mall indoor cube digital" },
  { id: 4, name: "신논현역 DSG빌딩 전광판", nameEn: "Sinnonhyeon DSG Building LED", location: "서울 강남구 신논현역", locationEn: "Sinnonhyeon Station, Gangnam-gu, Seoul", region: "seoul", type: "digital", price: 2800, dailyExposure: "250,000", features: "신논현 사거리, 높은 시인성", featuresEn: "Sinnonhyeon intersection, high visibility" },
  { id: 5, name: "청담동 학동사거리 SS타워 전광판", nameEn: "Cheongdam SS Tower LED", location: "서울 강남구 청담동", locationEn: "Cheongdam-dong, Gangnam-gu, Seoul", region: "seoul", type: "digital", price: 3200, dailyExposure: "200,000", features: "청담동 프리미엄 상권", featuresEn: "Cheongdam premium district" },
  { id: 6, name: "성수동 반도 외벽광고", nameEn: "Seongsu Bando Exterior Ad", location: "서울 성동구 성수동", locationEn: "Seongsu-dong, Seongdong-gu, Seoul", region: "seoul", type: "billboard", price: 2000, dailyExposure: "180,000", features: "성수 핫플레이스, 대형 외벽", featuresEn: "Seongsu hotspot, large exterior" },
  { id: 7, name: "지하철 2호선 성수역 디지털광고", nameEn: "Seongsu Station Line 2 Digital Ad", location: "서울 성동구 성수역", locationEn: "Seongsu Station, Seoul", region: "seoul", type: "subway", price: 1500, dailyExposure: "210,000", features: "2호선 주요역, 디지털 스크린", featuresEn: "Line 2 key station, digital screen" },
  { id: 8, name: "뉴욕 타임스퀘어 전광판", nameEn: "New York Times Square LED", location: "뉴욕 타임스퀘어", locationEn: "Times Square, New York", region: "national", type: "digital", price: 8000, dailyExposure: "1,500,000", features: "글로벌 랜드마크, 24시간 노출", featuresEn: "Global landmark, 24h exposure" },
  { id: 9, name: "두바이 부르즈 할리파 LED", nameEn: "Dubai Burj Khalifa LED", location: "두바이 부르즈 할리파", locationEn: "Burj Khalifa, Dubai", region: "national", type: "digital", price: 9500, dailyExposure: "2,000,000", features: "세계 최고층 빌딩 LED", featuresEn: "World's tallest building LED" },
  { id: 10, name: "일본 애드트럭", nameEn: "Japan Ad Truck", location: "일본 도쿄/오사카", locationEn: "Tokyo/Osaka, Japan", region: "national", type: "bus", price: 1800, dailyExposure: "300,000", features: "이동형 광고, 일본 주요 도시", featuresEn: "Mobile ad, major Japanese cities" },
];

export const typeLabels: Record<string, { ko: string; en: string }> = {
  billboard: { ko: "빌보드", en: "Billboard" },
  digital: { ko: "디지털", en: "Digital" },
  subway: { ko: "지하철", en: "Subway" },
  bus: { ko: "버스", en: "Bus" },
};
