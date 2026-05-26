export type PackageGuideStep = {
  step: number;
  title: string;
  desc: string;
};

export type PackageFaqItem = {
  q: string;
  a: string;
};

export type PublicMediaPackage = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  heroColor: string;
  icon: string;
  order: number;
  isActive: boolean;
  filterRegion: string[];
  filterCategory: string[];
  filterTarget: string[];
  filterMaxPrice: number | null;
  filterMinPrice: number | null;
  sortBy: string;
  badgeText: string | null;
  guideSteps: PackageGuideStep[];
  faqs: PackageFaqItem[];
  targetIndustry: string[];
  avgBudget: string | null;
};

export type MediaPackageSeedInput = Omit<
  PublicMediaPackage,
  "id" | "isActive" | "order"
> & { order?: number; isActive?: boolean };

export function parsePackageGuideSteps(raw: unknown): PackageGuideStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const step = Number(o.step);
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const desc = typeof o.desc === "string" ? o.desc.trim() : "";
      if (!title) return null;
      return { step: Number.isFinite(step) ? step : 0, title, desc };
    })
    .filter((x): x is PackageGuideStep => x != null)
    .sort((a, b) => a.step - b.step);
}

export function parsePackageFaqs(raw: unknown): PackageFaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const q = typeof o.q === "string" ? o.q.trim() : "";
      const a = typeof o.a === "string" ? o.a.trim() : "";
      if (!q) return null;
      return { q, a };
    })
    .filter((x): x is PackageFaqItem => x != null);
}
