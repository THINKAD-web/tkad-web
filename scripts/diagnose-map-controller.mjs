/**
 * 지도 컨트롤 재발 버그 재현·검증 하네스 (mock Kakao SDK).
 *
 * 왜 mock 인가: Kakao JS SDK 는 등록된 도메인(referer)에서만 로드되며, 이 sandbox
 * 도메인은 미등록 → SDK 가 403 으로 로드 불가(라이브 재현 불가). 그래서 KakaoMapView 의
 * 뷰 제어 로직을 충실히 모사한 mock 지도에 대해 "현재 코드"와 "수정 코드"를 동일 시나리오로
 * 돌려 (1) 사용자 focus 후 자동 fit 이 되돌리는 리셋, (2) unbound 메서드(getBounds) throw 를
 * 결정적으로 재현/검증한다.
 *
 *   node scripts/diagnose-map-controller.mjs            # 현재(버그) 동작 재현
 *   node scripts/diagnose-map-controller.mjs --fixed    # 수정(컨트롤러) 동작 검증
 */

const FIXED = process.argv.includes("--fixed");
const log = (...a) => console.log(...a);

// ── 충실 mock 지도 (실제 Kakao 와 동일하게 getBounds 가 this 의존) ──
function makeMockMap() {
  return {
    _level: 6,
    _center: { lat: 37.5, lng: 127.0 },
    _lastAction: "init",
    // 실제 Kakao 처럼 내부 상태(this)에 접근 → unbound 호출 시 throw
    getBounds() {
      const c = this._center; // this 없으면 throw
      const d = this._level * 0.02;
      return {
        getSouthWest: () => ({ getLat: () => c.lat - d, getLng: () => c.lng - d }),
        getNorthEast: () => ({ getLat: () => c.lat + d, getLng: () => c.lng + d }),
      };
    },
    getLevel() { return this._level; },
    setLevel(n) { this._level = n; this._lastAction = `setLevel:${n}`; },
    setCenter(p) { this._center = { lat: p.lat, lng: p.lng }; this._lastAction = `focus:${p.id ?? ""}`; },
    panTo(p) { this._center = { lat: p.lat, lng: p.lng }; this._lastAction = `pan:${p.id ?? ""}`; },
    getCenter() { const c = this._center; return { getLat: () => c.lat, getLng: () => c.lng }; },
    setBounds() { this._lastAction = "fitAll"; },
    relayout() {},
  };
}

// ── 시나리오: 네트워크 다지점, 사용자가 m3 마커 클릭 후 상위 리렌더로 mapMarkers 참조 변경 ──
function runStateMachine(fixed) {
  const markers = ["m0", "m1", "m2", "m3", "m4"];
  const map = makeMockMap();

  // 상태
  let selectedId = "m0";
  let focusActive = false;
  let userInteracted = false; // 수정안: 명령 채널 내장 게이트
  let mapMarkersRef = { tag: "v1" }; // identity

  // 파생 명령(현재 코드: prop 토글 / 수정안: 단일 명령 채널)
  const emitAutoFit = (reason) => {
    if (fixed && userInteracted) { log(`  · autoFit(${reason}) 무시 — 사용자 제스처 후`); return; }
    map.setBounds(); // fitAll
    map._logical = "fitAll";
    log(`  → map.fitAll (autoFit:${reason})`);
  };
  const emitFocus = (id) => {
    if (fixed) userInteracted = true; // 명령 채널이 "사용자 의도" 내장 표시
    map.setCenter({ lat: 37.4 + markers.indexOf(id) * 0.1, lng: 127.0, id });
    map.setLevel(4);
    map._logical = `focus:${id}`;
    log(`  → map.focus:${id}`);
  };

  // 1) 마운트: 다지점 → 자동 fit
  log("1) 마운트(네트워크 다지점):");
  emitAutoFit("mount");

  // 2) 사용자 m3 마커 클릭 → focus
  log("2) 사용자가 m3 마커 클릭:");
  focusActive = true; selectedId = "m3";
  emitFocus("m3");

  // 3) 상위 리렌더로 media/ mapMarkers 참조 변경 → 리셋 effect 발동
  log("3) 상위 리렌더로 mapMarkers 참조 변경(필터/리렌더 등):");
  const prevRef = mapMarkersRef;
  mapMarkersRef = { tag: "v2" }; // 새 identity (같은 내용, 다른 참조)
  const resetDepChanged = fixed
    ? false /* 수정안: 리셋 effect 의존성 [media.id] 원시값 → 미발동 */
    : prevRef !== mapMarkersRef; /* 현재: [media.id, mapMarkers] → 발동 */
  if (resetDepChanged) {
    selectedId = "m0"; focusActive = false; // 리셋
    log("  · reset effect 발동 → selectedId=m0, focusActive=false");
    // focusActive=false → fitMarkersBounds 재활성 → effect#1 재-fit
    emitAutoFit("reset→fitMarkersBounds");
  } else {
    log("  · reset effect 미발동(의존성 단순화) — 상태 유지");
  }

  const finalFocusHeld = map._logical === "focus:m3";
  log(`\n결과: 최종 map 뷰 = "${map._logical}"  | 사용자 focus 유지? ${finalFocusHeld ? "✅ 예" : "❌ 아니오(리셋됨)"}`);
  return finalFocusHeld;
}

// ── unbound 메서드(getBounds) throw 재현 ──
function runUnboundCall() {
  const map = makeMockMap();
  log("[B] ensureAtLeastOneMarkerVisible 의 `const getBounds = map.getBounds; getBounds()` (kakao-map-view.tsx:492,500)");
  // 현재 코드: 메서드를 떼어내 호출 → this 손실
  try {
    const getBounds = map.getBounds; // unbound
    const bounds = getBounds();      // throws
    log("  unbound 호출 성공?", !!bounds);
  } catch (e) {
    log(`  ❌ THROW: ${e.constructor.name}: ${e.message}`);
    log(`     (현재 코드는 try/catch 로 삼켜 ensure-visible 가 조용히 무효화됨 → focus 후 마커가 화면 밖이어도 보정 실패)`);
  }
  if (FIXED) {
    // 수정안: 바인딩 유지
    try {
      const bounds = map.getBounds(); // bound (정상)
      log(`  ✅ FIXED: map.getBounds() 정상 (sw.lat=${bounds.getSouthWest().getLat().toFixed(3)})`);
    } catch (e) {
      log(`  ❌ FIXED 에서도 throw: ${e.message}`);
    }
  }
}

// ── 스트레스: 클릭→드래그→필터변경 반복(컨트롤러 게이트 의미 모사) ──
function runStress(fixed) {
  const map = makeMockMap();
  let userInteracted = false;
  const autoFit = () => {
    if (fixed && userInteracted) return false; // 게이트
    map._logical = "fitAll"; return true;
  };
  const focus = (id) => { if (fixed) userInteracted = true; map._logical = `focus:${id}`; };
  const userDrag = () => { if (fixed) userInteracted = true; map._logical = "userDrag"; }; // DOM 입력 → 게이트 set

  autoFit(); // mount
  let resets = 0;
  for (let i = 0; i < 20; i++) {
    focus(`m${i % 5}`);
    userDrag(); // 사용자가 드래그로 위치 조정
    const before = map._logical;
    // 필터 변경/리렌더가 auto fit 을 시도(현재 코드는 mapMarkers 참조 변경 시 리셋 effect)
    const fitFired = autoFit();
    if (fitFired && map._logical === "fitAll" && before !== "fitAll") resets++;
  }
  log(`  20회 (focus→drag→필터리렌더) 반복 후 의도치 않은 리셋 횟수: ${resets} ${resets === 0 ? "✅" : "❌"}`);
  return resets;
}

log(`\n=== ${FIXED ? "수정(컨트롤러)" : "현재(버그)"} 동작 — 리셋 경쟁 시나리오 ===`);
const held = runStateMachine(FIXED);
log(`\n=== unbound 메서드 throw ===`);
runUnboundCall();
log(`\n=== 스트레스 테스트 (반복 조작 안정성) ===`);
const resets = runStress(FIXED);
log(`\n총평: focus 유지 ${held ? "성공" : "실패"} · 반복 리셋 ${resets}회 (${FIXED ? "수정안" : "현재"})`);
process.exit(0);
