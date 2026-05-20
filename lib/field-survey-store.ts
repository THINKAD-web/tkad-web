/** 현장 답사 모드 — 방문 매체·메모 (localStorage) */

export type FieldSurveyVisit = {
  mediaId: string;
  name: string;
  location: string;
  type: string;
  lat: number;
  lng: number;
  visitedAt: string;
  note: string;
};

export type FieldSurveySession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  visits: FieldSurveyVisit[];
};

const SESSION_KEY = "tkad-field-survey-session-v1";

export function readFieldSurveySession(): FieldSurveySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FieldSurveySession;
    if (!parsed?.id || !Array.isArray(parsed.visits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFieldSurveySession(session: FieldSurveySession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function startFieldSurveySession(): FieldSurveySession {
  const session: FieldSurveySession = {
    id: `survey-${Date.now()}`,
    startedAt: new Date().toISOString(),
    visits: [],
  };
  writeFieldSurveySession(session);
  return session;
}

export function clearFieldSurveySession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function toggleSurveyVisit(
  item: Omit<FieldSurveyVisit, "visitedAt" | "note"> & { note?: string },
): FieldSurveySession {
  let session = readFieldSurveySession() ?? startFieldSurveySession();
  const idx = session.visits.findIndex((v) => v.mediaId === item.mediaId);
  if (idx >= 0) {
    session = {
      ...session,
      visits: session.visits.filter((v) => v.mediaId !== item.mediaId),
    };
  } else {
    session = {
      ...session,
      visits: [
        ...session.visits,
        {
          ...item,
          visitedAt: new Date().toISOString(),
          note: item.note ?? "",
        },
      ],
    };
  }
  writeFieldSurveySession(session);
  return session;
}

export function updateSurveyNote(mediaId: string, note: string): void {
  const session = readFieldSurveySession();
  if (!session) return;
  writeFieldSurveySession({
    ...session,
    visits: session.visits.map((v) =>
      v.mediaId === mediaId ? { ...v, note } : v,
    ),
  });
}

export const FIELD_SURVEY_RADIUS_KM = 0.5;
