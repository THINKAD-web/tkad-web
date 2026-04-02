import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgePercent,
  Clock,
  Copy,
  Crown,
  Eye,
  Flame,
  Gem,
  MapPin,
  Mic2,
  Music,
  Music2,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

/** `specialFeature` 문구에 맞는 Lucide 아이콘 (위에서 아래로 첫 매칭). 구체적인 패턴을 먼저 둡니다. */
const RULES: { test: RegExp; icon: LucideIcon }[] = [
  { test: /완판\s*임박|완판임박|마감\s*임박|한정\s*수량|재고\s*부족/i, icon: AlertTriangle },
  { test: /프리미엄\s*위치|프리미엄\s*입지|핵심\s*입지|황금\s*존/i, icon: MapPin },
  { test: /빠른\s*집행|즉시\s*집행|신속\s*집행|단기\s*집행|스피드\s*집행/i, icon: Clock },
  { test: /더블\s*노출|이중\s*노출|듀얼|복합\s*노출|멀티\s*노출/i, icon: Copy },
  { test: /K-?\s*POP\s*최적|케이팝\s*최적|K-?\s*POP\s*특화/i, icon: Music },
  { test: /K-?\s*POP|케이팝|케이\s*팝|아이돌|팬덤|음원|뮤직/i, icon: Music2 },
  { test: /라이브|공연|콘서트/i, icon: Mic2 },
  { test: /핫플레이스|핫플|핫\s*스팟|인스타\s*핫/i, icon: Flame },
  { test: /MZ세대\s*타겟|MZ\s*타겟|세대\s*타겟|타겟\s*최적|2030\s*타겟/i, icon: Users },
  { test: /MZ|2030|Z\s*세대|밀레니얼|젊은\s*층/i, icon: Users },
  { test: /고효율|고\s*효율|효율\s*극대|비용\s*효율/i, icon: TrendingUp },
  { test: /입지|상권|거점|코너|요지/i, icon: MapPin },
  { test: /즉시|신속|단기|스피드/i, icon: Clock },
  { test: /더블|이중|듀얼/i, icon: Copy },
  { test: /트래픽|유동|인파|집객/i, icon: TrendingUp },
  { test: /야간|심야|24|올나잇/i, icon: Eye },
  { test: /QR|인터랙티브|체험|참여/i, icon: Radio },
  { test: /브랜드|시그니처|아이코닉|랜드마크/i, icon: Crown },
  { test: /프리미엄|럭셔리|하이엔드/i, icon: Gem },
  { test: /노출\s*보장|가시성|시인성/i, icon: Star },
  { test: /할인|가성비|단가|저비용/i, icon: BadgePercent },
  { test: /신뢰|검증|안전|보장/i, icon: ShieldCheck },
  { test: /화제|바이럴|화력|이슈/i, icon: Flame },
  { test: /임팩트|강한|압도/i, icon: Zap },
];

export function premiumFeatureIconForLabel(label: string): LucideIcon {
  const s = label.trim();
  if (!s) return Sparkles;
  for (const { test, icon } of RULES) {
    if (test.test(s)) return icon;
  }
  return Sparkles;
}
