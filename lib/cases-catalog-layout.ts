import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import {
  hasActiveCaseFilters,
  matchesCaseFilters,
  type CaseFilterState,
} from "@/lib/success-case-hub";

export function pickRecommendedCases(
  cases: PublicSuccessCaseListItem[],
  limit = 3,
): PublicSuccessCaseListItem[] {
  return [...cases]
    .sort((a, b) => {
      const ta = a.publishedAtIso ? Date.parse(a.publishedAtIso) : 0;
      const tb = b.publishedAtIso ? Date.parse(b.publishedAtIso) : 0;
      return tb - ta;
    })
    .slice(0, limit);
}

export function partitionCasesGrid(
  filtered: PublicSuccessCaseListItem[],
  recommended: PublicSuccessCaseListItem[],
): PublicSuccessCaseListItem[] {
  const recIds = new Set(recommended.map((c) => c.id));
  return filtered.filter((c) => !recIds.has(c.id));
}

export function filterCasesList(
  cases: PublicSuccessCaseListItem[],
  filters: CaseFilterState,
  query: string,
): PublicSuccessCaseListItem[] {
  return cases.filter((c) => matchesCaseFilters(c, filters, query));
}

export function resolveCasesCatalogView(
  cases: PublicSuccessCaseListItem[],
  filters: CaseFilterState,
  query: string,
) {
  const activeFilters = hasActiveCaseFilters(filters, query);
  const filtered = filterCasesList(cases, filters, query);
  const recommended = pickRecommendedCases(
    activeFilters ? filtered : cases,
    3,
  );
  const gridCases = partitionCasesGrid(filtered, recommended);
  return { filtered, recommended, gridCases, activeFilters };
}
