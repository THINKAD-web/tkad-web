import {
  appendPatternStatsOperationalNote,
  isPatternStatsNotesEnabled,
  lookupPatternStatsCount,
  resolvePatternStatsOperationalNote,
} from "@/lib/recommend/pattern-stats-lookup";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

function appendNoteToEffectSummarySection(
  payload: PlannerReportExportPayload,
  note: string,
): PlannerReportExportPayload {
  const isKo = payload.isKo;
  const title = isKo ? "효과 요약" : "Effect summary";
  const sections = [...(payload.sections ?? [])];
  const idx = sections.findIndex((s) => s.title === title);

  if (idx >= 0) {
    const section = sections[idx]!;
    if (section.lines.includes(note)) return payload;
    sections[idx] = {
      ...section,
      lines: [...section.lines, note],
    };
  } else {
    sections.push({
      title: isKo ? "참고" : "Reference",
      lines: [note],
    });
  }

  return { ...payload, sections };
}

/** Server-side enrich before PDF/PPTX — uses payload.patternStatsQuery only. */
export async function enrichPlannerExportPayloadWithPatternStats(
  payload: PlannerReportExportPayload,
): Promise<PlannerReportExportPayload> {
  if (!isPatternStatsNotesEnabled() || !payload.patternStatsQuery) {
    return payload;
  }

  const combo = payload.patternStatsQuery;
  const count = await lookupPatternStatsCount(combo);
  if (count == null) return payload;

  const note = await resolvePatternStatsOperationalNote(combo, payload.isKo);
  if (!note) return payload;

  if (payload.onlineSection?.insights) {
    return {
      ...payload,
      onlineSection: {
        ...payload.onlineSection,
        insights: {
          ...payload.onlineSection.insights,
          operationalNotes: appendPatternStatsOperationalNote(
            payload.onlineSection.insights.operationalNotes,
            count,
            payload.isKo,
          ),
        },
      },
    };
  }

  return appendNoteToEffectSummarySection(payload, note);
}
