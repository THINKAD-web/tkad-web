import { Suspense } from "react";
import { SearchResultsClient } from "@/components/search/search-results-client";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsClient />
    </Suspense>
  );
}
