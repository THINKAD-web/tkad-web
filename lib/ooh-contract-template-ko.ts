/**
 * OOH 광고계약서 — KO 표준 템플릿 (제1조~제11조 + 서명란).
 *
 * 법무 원문: 스펙토리·싱커드 표준 광고계약서 (제1~11조 + 서명란).
 * PDF 렌더러(`buildOohContractPdf`) 연결 전 — 변수 치환 헬퍼만 제공.
 *
 * @see OOH_CONTRACT_TEMPLATE_VARIABLE_MAPPING
 */

import { CONTACT_EMAIL } from "@/lib/constants";

/** 템플릿 버전 — 법무 원문 변경 시 bump */
export const OOH_CONTRACT_TEMPLATE_KO_VERSION = "1.0.0";

/**
 * 을 (주)싱커드 — 계약서 원문 고정값 (매 건 동일).
 * 서명란·전문의 "(주)싱커드" 표기와 일치.
 */
export const OOH_CONTRACT_PARTY_B_KO = {
  role: "을",
  companyName: "(주)싱커드",
  representative: "이 재 한",
  address: "서울 성동구 뚝섬로17가길 48",
  tel: "02-515-2772",
  /** footer·세금계산서용 (서명란 원문과 별도) */
  businessRegNo: "319-86-00382",
  email: CONTACT_EMAIL,
} as const;

export type OohContractTemplateVars = {
  /** 갑 상호 — 예: (주)스펙토리 */
  clientCompany: string;
  /** 갑 대표이사 (서명란) — 예: 최 진 영 */
  clientRepName: string;
  /** 갑 주소 (서명란) */
  clientAddress: string;
  /** 갑 전화번호 (서명란) */
  clientPhone: string;
  /** 광고명칭 — 예: 교보문고에 사이니지 광고 */
  campaignName: string;
  /** 광고기간 시작 — 예: 2026년 07월 06일 */
  periodStart: string;
  /** 광고기간 종료 — 예: 2026년 08월 05일 */
  periodEnd: string;
  /** 광고기간 개월 표기 — 예: 1개월 */
  periodMonths: string;
  /** 제작비용 — 예: 자체제작 */
  productionCost: string;
  /** 매체수량 — 예: 1기 */
  mediaCount: string;
  /** 최종합계 — 예: ₩ 2,156,000원 (VAT포함) */
  totalAmount: string;
  /** 제3조 한글 금액 — 예: 이백일십오만육천원정 */
  amountKorean: string;
  /** 결제방법 — 예: 계산서 발행 후 선결제 */
  paymentMethod: string;
  /** 계약 체결일 — 예: 2026년 6월 29일 */
  contractDate: string;
};

export const OOH_CONTRACT_TEMPLATE_VAR_KEYS = [
  "clientCompany",
  "clientRepName",
  "clientAddress",
  "clientPhone",
  "campaignName",
  "periodStart",
  "periodEnd",
  "periodMonths",
  "productionCost",
  "mediaCount",
  "totalAmount",
  "amountKorean",
  "paymentMethod",
  "contractDate",
] as const satisfies readonly (keyof OohContractTemplateVars)[];

export type OohContractTemplateVarKey =
  (typeof OOH_CONTRACT_TEMPLATE_VAR_KEYS)[number];

export type OohContractTemplateVarSource =
  | "existing"
  | "derivable"
  | "new_input";

export type OohContractTemplateVariableMapping = {
  key: OohContractTemplateVarKey;
  labelKo: string;
  source: OohContractTemplateVarSource;
  pipelineHint?: string;
  standaloneHint?: string;
  notes?: string;
};

/**
 * 변수 매핑표 — (a) existing (b) derivable (c) new_input
 */
export const OOH_CONTRACT_TEMPLATE_VARIABLE_MAPPING: OohContractTemplateVariableMapping[] =
  [
    {
      key: "clientCompany",
      labelKo: "갑 상호",
      source: "existing",
      pipelineHint: "OoHQuote.clientCompany",
      standaloneHint: "StandaloneContractPreviewBody.clientCompany",
    },
    {
      key: "clientRepName",
      labelKo: "갑 대표이사 (서명란)",
      source: "new_input",
      pipelineHint: "contractMeta.clientRepName (adminNote JSON)",
      standaloneHint: "clientRepName 입력",
      notes: "원문 서명란 대표이사명; 을(이 재 한)은 OOH_CONTRACT_PARTY_B_KO 고정",
    },
    {
      key: "clientAddress",
      labelKo: "갑 주소 (서명란)",
      source: "new_input",
      pipelineHint: "contractMeta.clientAddress",
      standaloneHint: "clientAddress 입력",
    },
    {
      key: "clientPhone",
      labelKo: "갑 전화번호 (서명란)",
      source: "existing",
      pipelineHint: "OoHQuote.clientPhone 또는 contractMeta",
      standaloneHint: "clientPhone 입력",
    },
    {
      key: "campaignName",
      labelKo: "광고명칭",
      source: "new_input",
      pipelineHint: "없음",
      standaloneHint: "없음",
    },
    {
      key: "periodStart",
      labelKo: "광고기간 시작",
      source: "derivable",
      pipelineHint: "OoHQuote.startDate → locale 날짜 문자열",
      standaloneHint: "startDate 포맷",
    },
    {
      key: "periodEnd",
      labelKo: "광고기간 종료",
      source: "derivable",
      pipelineHint: "OoHQuote.endDate → locale 날짜 문자열",
      standaloneHint: "endDate 포맷",
    },
    {
      key: "periodMonths",
      labelKo: "광고기간 (개월)",
      source: "derivable",
      pipelineHint: "startDate/endDate 차이 또는 OoHQuote.period 파싱",
      standaloneHint: "start/end 차이 계산",
      notes: '원문 형식 예: "1개월"',
    },
    {
      key: "productionCost",
      labelKo: "제작비용",
      source: "derivable",
      pipelineHint: "quoteBreakdown addon/custom line 라벨·금액",
      standaloneHint: "신규 입력",
      notes: '원문 예: "자체제작"',
    },
    {
      key: "mediaCount",
      labelKo: "매체수량",
      source: "derivable",
      pipelineHint: "quoteBreakdown.lines quantityLabel 합산",
      standaloneHint: "selectedMedia.length 또는 수량 입력",
      notes: '원문 예: "1기"',
    },
    {
      key: "totalAmount",
      labelKo: "최종합계 (VAT 포함 표기)",
      source: "derivable",
      pipelineHint: "quoteBreakdown.totalWon → ₩ 표기",
      standaloneHint: "totalAmountManwon → VAT 포함 ₩ 변환",
      notes: '원문 형식: "₩ 2,156,000원 (VAT포함)"',
    },
    {
      key: "amountKorean",
      labelKo: "제3조 한글 금액",
      source: "derivable",
      pipelineHint: "quoteBreakdown.totalWon → wonToKoreanLegalAmount",
      standaloneHint: "VAT 포함 원 → wonToKoreanLegalAmount",
      notes: '원문 예: "이백일십오만육천원정"',
    },
    {
      key: "paymentMethod",
      labelKo: "결제방법",
      source: "new_input",
      pipelineHint: "없음",
      standaloneHint: "없음",
      notes: '기본값 후보 정책 별도 — 원문 예: "계산서 발행 후 선결제"',
    },
    {
      key: "contractDate",
      labelKo: "계약 체결일",
      source: "derivable",
      pipelineHint: "preview/sign 시점 KST 또는 OohContract.signedAt",
      standaloneHint: "PDF 생성일 (KST)",
    },
  ];

export type OohContractTemplateSectionKind =
  | "title"
  | "preamble"
  | "article"
  | "signature";

export type OohContractTemplateSection = {
  kind: OohContractTemplateSectionKind;
  heading: string;
  paragraphs: readonly string[];
};

export type OohContractKoTemplate = {
  version: typeof OOH_CONTRACT_TEMPLATE_KO_VERSION;
  title: string;
  sections: readonly OohContractTemplateSection[];
};

export const OOH_CONTRACT_TEMPLATE_KO_SOURCE = {
  sourceDocumentPending: false as const,
  expectedArticleCount: 11,
  sourceRevision: "spectory-thinkad-standard-v1",
} as const;

/**
 * 제1조~제11조 + 서명란 원문 (변수 치환 부분만 {{}}).
 * 원문 오탈자·띄어쓰기(예: "광고 료", "판단하 고") 포함 그대로 유지.
 */
export const OOH_CONTRACT_TEMPLATE_KO_ARTICLES: readonly OohContractTemplateSection[] =
  [
    {
      kind: "title",
      heading: "광고계약서",
      paragraphs: [],
    },
    {
      kind: "preamble",
      heading: "전문",
      paragraphs: [
        '{{clientCompany}} (이하"갑"이라한다)과 (주)싱커드 (이하"을"이라한다.)는 상호간에 계약을 서로 협의하여 다음과 같이 체결한다.',
      ],
    },
    {
      kind: "article",
      heading: "제1조 (계약의 성립 및 효력)",
      paragraphs: [
        "제1조 (계약의 성립 및 효력) 계약일로부터 한다.",
        "광고명칭 :   {{campaignName}}",
        "광고기간 : {{periodStart}} - {{periodEnd}} ({{periodMonths}})   단, 광고기간은 제작관계상 개시일이 변동될 수 있습니다.",
        "제작비용 : {{productionCost}}",
        "매체수량 : {{mediaCount}}",
        "최종합계 : {{totalAmount}}",
        "결제방법 : {{paymentMethod}}",
      ],
    },
    {
      kind: "article",
      heading: "제2조 (계약의목적)",
      paragraphs: [
        '제2조 (계약의목적) "갑"은 "갑"의 광고물에 대한 제작 및 유지 관리를 "을"에게 위임해서 "을"로 하여금 광고물의 제작 및 유지 관리를 성실하게 이행 함을 목적으로 한다.',
      ],
    },
    {
      kind: "article",
      heading: "제3조 (광고료지급)",
      paragraphs: [
        '제3조 (광고료지급) 1) 본 계약의 지급 방법은 제 1조의 결제 방법을 따른다. 2) "갑"은" 을"의 청구에 의해 광고료를 "을"에게 현금 {{amountKorean}}   {{totalAmount}} 광고료를 지급한다.',
      ],
    },
    {
      kind: "article",
      heading: "제4조 (계약기간)",
      paragraphs: [
        '제4조 (계약기간) 1) 본 계약의 기간은 제 1조 계약 기간에 따른다. 2) 계약 만료 시 만료일 한 달 전에"갑", "을" 쌍방 간 협의 하에 계약기간을 연장할 수 있다.',
      ],
    },
    {
      kind: "article",
      heading: "제5조 (광고물의 제작)",
      paragraphs: [
        '제5조 (광고물의 제작) 1) 광고물은 "갑"이 제시한 사양의 원고에 의해 "을"이 제작, 설치하고, 계약 기간 중 "갑"의 요구에 의한 광고물 변경 시 교체 비용은 "갑"이 부담한다. 2) "을"은 "갑"으로 부터 광고안 수령 후 5일 이내에 관련 인허가청에 허가 접수를 하여야 하며, 허가증 수령 후 일정에 맞추어 제작, 설치를 완료하여야 한다. 3) 설치가 완료된 이후 7일 이내 설치보고서를 "갑"에게 제출한다.',
      ],
    },
    {
      kind: "article",
      heading: "제6조 (광고물 관리)",
      paragraphs: [
        '제6조 (광고물 관리) "을"은 "갑"과의 계약을 성실히 이행하기 위하여 월 1회 이상 광고물을 점검해야 한다. "갑"의 관리 요구가 있을 경우 1개월 이내라 하여도 7일 이내에 관리에 응해야 되며 관리사항을 "갑"에게 통보해야 한다.',
      ],
    },
    {
      kind: "article",
      heading: "제7조 (계약의 중도해지)",
      paragraphs: [
        '제7조 (계약의 중도해지) "갑"은 다음 각 항에 해당되는 경우 발생 시, "을"과의 사전 협의를 거쳐 본 계약을 해지할 수 있으며, 이 경우 해당 월의 광고 료는 일할 계산하여 정산 지급하는 것을 원칙으로 한다. 1) "을"이 "갑"의 정당한 요구사항을 성실히 이행하지 않았을 경우. 2) "을"의 귀책사유로 인하여 광고대행 및 관리에 현저한 장애가 발생하여 계약의 성실한 이행이 불가능 하다고 "갑"이 판단하 고 "을"이 인정 하였을 때. 3) 해당 관청 및 상급 기관의 행정명령에 의해 광고물이 철거되는 경우. 4) 계약기간 중 계약 목적물의 법적인, 허가기간 및 입찰 등으로 인한 사용 기간의 만기가 도래하거나 기타 계약 목적물에 관 한 사용 및 임차 기간이 종료된 경우. 5) 상기 각 항의 경우 외에 "갑"의 일방적인 사정에 의해 광고 계약을 해지할 경우 다음과 같이 위약금을 지불하며 할인 또는 서비스 송출을 포함하는 경우 해당 비용을 모두 포함한 금액으로 계산한다. (1) 광고 시작 전 광고계약이 해지되는 경우 "갑"은 "을"에게 전체 계약기간에 대한 광고료 50%를 현금 일시불 지급한다. 단, 계약 해지 시점에 제작, 시공이 들어간 경우 해당 비용은 100% 일시불 지급한다. (2) 광고 시작 후 광고계약이 중도 해지되는 경우 "갑"은 "을"에게 전체 계약기간에 대한 광고료 100%를 현금 일시불 지급한 다.',
      ],
    },
    {
      kind: "article",
      heading: "제8조 (불가항력 등)",
      paragraphs: [
        '제8조 (불가항력 등) 1) 계약기간 중에 천재지변, 폭동, 전쟁, 정부의 규제 등 사회 통념상 불가항력 적 사유로 계약이행이 불가능할 경우, 계약 불 이행에 대한 책임을 지지 않는다.',
      ],
    },
    {
      kind: "article",
      heading: "제9조 (자료 제공 및 비밀유지)",
      paragraphs: [
        '제9조 (자료 제공 및 비밀유지) 1) "갑" 또는 "을"은 옥외광고에 필요한 정보 및 자료제공에 상호 협조하여야 하며, "갑"과 "을"은 이를 통해 알게 된 영업 관련 정보를 상호 서면 동의 없이 임의로 이용하거나 제 3자에게 제공 또는 공개 하여서는 아니 된다.',
      ],
    },
    {
      kind: "article",
      heading: "제10조 (재판관할) · 제11조 (효력발생)",
      paragraphs: [
        '제10조 (재판관할) 1) 본 계약상의 분쟁에 관한 재판 관할은 "갑"의 소재지를 관할하는 법원으로 한다. 2) 본 계약서는 계약의 성실한 이행을 위하여 본 계약서를 2부 작성하여 "갑", "을" 기명 날인 후 각각 1부씩 보관한다. 제11조 (효력발생) 1) 본 계약은 계약체결일로부터 효력이 발생한다.',
      ],
    },
    {
      kind: "signature",
      heading: "서명란",
      paragraphs: [
        "{{contractDate}}",
        '"갑" 상호 : {{clientCompany}} 주소 : {{clientAddress}} 전화번호 : {{clientPhone}} 대표이사 : {{clientRepName}} (인)',
        '"을" 상호 : (주)싱커드 주소 : 서울 성동구 뚝섬로17가길 48 전화번호 : 02-515-2772 대표이사 : 이 재 한 (인)',
      ],
    },
  ];

/** {{partyB*}} — 을 고정값 (본문에 partyB 변수 사용 시) */
export function oohContractPartyBTemplateVars(): Record<string, string> {
  const b = OOH_CONTRACT_PARTY_B_KO;
  return {
    partyBCompany: b.companyName,
    partyBRepName: b.representative,
    partyBAddress: b.address,
    partyBTel: b.tel,
    partyBEmail: b.email,
    partyBBusinessRegNo: b.businessRegNo,
  };
}

export function fillOohContractTemplateText(
  text: string,
  vars: Partial<OohContractTemplateVars> & Record<string, string | undefined>,
): string {
  let out = text;
  const merged = { ...oohContractPartyBTemplateVars(), ...vars };
  for (const [key, value] of Object.entries(merged)) {
    if (value == null) continue;
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function fillOohContractTemplateSections(
  sections: readonly OohContractTemplateSection[],
  vars: Partial<OohContractTemplateVars> & Record<string, string | undefined>,
): OohContractTemplateSection[] {
  return sections.map((s) => ({
    ...s,
    paragraphs: s.paragraphs.map((p) => fillOohContractTemplateText(p, vars)),
  }));
}

export function buildOohContractKoTemplate(
  vars: Partial<OohContractTemplateVars> & Record<string, string | undefined>,
): OohContractKoTemplate {
  return {
    version: OOH_CONTRACT_TEMPLATE_KO_VERSION,
    title:
      OOH_CONTRACT_TEMPLATE_KO_ARTICLES.find((s) => s.kind === "title")
        ?.heading ?? "광고계약서",
    sections: fillOohContractTemplateSections(
      OOH_CONTRACT_TEMPLATE_KO_ARTICLES,
      vars,
    ),
  };
}

/** 원문 11조 본문이 모두 로드되었는지 (제10·11조는 원문상 동일 단락) */
export function isOohContractTemplateKoSourceComplete(): boolean {
  const articles = OOH_CONTRACT_TEMPLATE_KO_ARTICLES.filter(
    (s) => s.kind === "article",
  );
  if (articles.length !== 10) return false;
  return articles.every((a) => a.paragraphs.some((p) => p.trim().length > 0));
}

/** 원문 대조용 — 스펙토리 샘플 변수 (PDF 미리보기·검증) */
export const OOH_CONTRACT_TEMPLATE_SAMPLE_VARS: OohContractTemplateVars = {
  clientCompany: "(주)스펙토리",
  clientRepName: "최 진 영",
  clientAddress: "서울특별시 송파구 오금로 185, 4층",
  clientPhone: "010-3589-2330",
  campaignName: "교보문고에 사이니지 광고",
  periodStart: "2026년 07월 06일",
  periodEnd: "2026년 08월 05일",
  periodMonths: "1개월",
  productionCost: "자체제작",
  mediaCount: "1기",
  totalAmount: "₩ 2,156,000원 (VAT포함)",
  amountKorean: "이백일십오만육천원정",
  paymentMethod: "계산서 발행 후 선결제",
  contractDate: "2026년 6월 29일",
};
