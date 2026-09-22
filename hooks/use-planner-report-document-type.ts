"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PLANNER_DOCUMENT_TYPE,
  parsePlannerDocumentType,
  type PlannerDocumentTypeKey,
} from "@/lib/planner-report-export/document-type";

const STORAGE_KEY = "tkad:planner-report-document-type:v1";

export function readPlannerReportDocumentType(): PlannerDocumentTypeKey {
  if (typeof window === "undefined") return DEFAULT_PLANNER_DOCUMENT_TYPE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return parsePlannerDocumentType(raw);
  } catch {
    return DEFAULT_PLANNER_DOCUMENT_TYPE;
  }
}

export function writePlannerReportDocumentType(type: PlannerDocumentTypeKey): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, type);
  } catch {
    /* quota / private mode */
  }
}

export function usePlannerReportDocumentType(): [
  PlannerDocumentTypeKey,
  (next: PlannerDocumentTypeKey) => void,
] {
  const [documentType, setDocumentType] = useState<PlannerDocumentTypeKey>(
    DEFAULT_PLANNER_DOCUMENT_TYPE,
  );

  useEffect(() => {
    setDocumentType(readPlannerReportDocumentType());
  }, []);

  const update = useCallback((next: PlannerDocumentTypeKey) => {
    setDocumentType(next);
    writePlannerReportDocumentType(next);
  }, []);

  return [documentType, update];
}
