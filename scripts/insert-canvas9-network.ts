import { getPrisma } from "../lib/prisma";

const prisma = getPrisma();

async function main() {
  const network = await prisma.mediaNetwork.create({
    data: {
      name: "9호선 Canvas9 사각기둥",
      nameEn: "Line 9 Canvas9 Square Pillar",
      description: "서울 지하철 9호선(황금 골드라인) 주요 프라임 역사 5곳에 총 20개 설치된 신규 디지털 사각기둥 광고 네트워크. 여의도, 신논현, 고속터미널 등 유동인구가 많은 핵심 동선에 4면 노출되는 Canvas9 매체로, 방향 안내 기능까지 결합되어 높은 시인성과 브랜드 전달 효과를 기대할 수 있습니다.",
      type: "subway_digital_square_pillar",
      pricePerUnit: null,
      priceNote: "역별·위치별·수량별 가격 상이 (신논현·고속터미널 등 프라임 역은 더 높음). 정확한 견적은 매체사(싱커드 등) 별도 문의 필수. VAT 별도, 제작·시공비 별도",
      minUnits: 1,
      totalLocations: 20,
      regions: ["서울"],
      city: "서울특별시",
      district: "강남구, 영등포구, 서초구, 동작구, 강서구 등",
      features: "4면 사각기둥 노출, 고해상도 디지털 Canvas9, 방향 안내 기능 결합, 역사 동선 중심 설치, 24시간 조명 노출, 신규 프라임 매체",
      visibilityScore: 85,
      dailyFootfall: 150000,
      targetAge: "20-40세",
      effectMemo: "9호선 핵심 5개 역사에 총 20개 기둥형 디지털 광고 설치. 동선 중심에 위치해 자연스러운 시선 집중이 우수하며, 기존 벽면 광고와 차별화된 4면 노출 + 방향 안내 결합으로 효과가 뛰어납니다. 강남-여의도 비즈니스 및 젊은 층 유동이 활발한 황금노선의 프라임 매체.",
      operatingHours: "역 운영시간 내 (고시인성 디지털 조명)",
      tags: ["9호선", "Canvas9", "사각기둥", "지하철광고", "디지털기둥", "황금노선", "강남", "여의도", "프라임역", "4면노출", "신규매체"],
      isActive: true,
      locations: {
        create: [
          {
            name: "신논현역 Canvas9 사각기둥",
            fullAddress: "서울 강남구 신논현로 222",
            address: "서울 강남구 신논현로 222",
            latitude: 37.5045,
            longitude: 127.0250,
            priceNote: "프라임 역, 가격 가장 높음 (별도 견적)",
            dailyFootfall: 55000,
            note: "강남 오피스·상권 중심, 유동인구 최고 수준",
          },
          {
            name: "고속터미널역 Canvas9 사각기둥",
            fullAddress: "서울 서초구 신반포로 188",
            address: "서울 서초구 신반포로 188",
            latitude: 37.5048,
            longitude: 127.0047,
            priceNote: "환승역 프라임 위치 (별도 견적)",
            dailyFootfall: 30000,
            note: "3·7·9호선 환승, 백화점·호텔 밀집",
          },
          {
            name: "여의도역 Canvas9 사각기둥",
            fullAddress: "서울 영등포구 여의나루로 40",
            address: "서울 영등포구 여의나루로 40",
            latitude: 37.5216,
            longitude: 126.9243,
            priceNote: "비즈니스 중심지 (별도 견적)",
            dailyFootfall: null,
            note: "금융·비즈니스 중심, 5호선 환승",
          },
          {
            name: "노량진역 Canvas9 사각기둥",
            fullAddress: "서울 동작구 노량진로 151",
            address: "서울 동작구 노량진로 151",
            latitude: 37.5141,
            longitude: 126.9428,
            priceNote: "중간 가격대 (별도 견적)",
            dailyFootfall: null,
            note: "1호선 환승, 수산시장·원룸촌",
          },
          {
            name: "마곡나루역 Canvas9 사각기둥",
            fullAddress: "서울 강서구 마곡중앙로 165",
            address: "서울 강서구 마곡중앙로 165",
            latitude: 37.5673,
            longitude: 126.8294,
            priceNote: "상대적으로 저렴한 가격대 (별도 견적)",
            dailyFootfall: null,
            note: "마곡지구 핵심역, 서울식물원 인접",
          },
        ],
      },
    },
    include: { locations: true },
  });

  console.log("✅ 네트워크 매체 등록 완료!");
  console.log("ID:", network.id);
  console.log("Name:", network.name);
  console.log("Locations:", network.locations.length, "개");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
