/**
 * Admin API는 실패 시에도 JSON `{ error }`를 주도록 하지만,
 * 프록시·런타임 오류 시 HTML이 올 수 있어 `res.json()`만 쓰면 예외가 납니다.
 */

export async function readAdminResponseJson(res: Response): Promise<
  | { ok: true; data: unknown }
  | { ok: false; message: string }
> {
  const raw = await res.text();
  if (!raw.trim()) {
    if (res.ok) return { ok: true, data: {} };
    return { ok: false, message: `요청 실패 (HTTP ${res.status})` };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      message: `서버 응답을 읽을 수 없습니다 (HTTP ${res.status}). 배포 로그·DB 연결을 확인해 주세요.`,
    };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `요청 실패 (HTTP ${res.status})`;
    return { ok: false, message: msg };
  }
  return { ok: true, data };
}

export async function adminFetchJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<
  | { ok: true; data: unknown; status: number }
  | { ok: false; message: string; status: number }
> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `연결 실패: ${msg}`, status: 0 };
  }
  const parsed = await readAdminResponseJson(res);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message, status: res.status };
  }
  return { ok: true, data: parsed.data, status: res.status };
}
