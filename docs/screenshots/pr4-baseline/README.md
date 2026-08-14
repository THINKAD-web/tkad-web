# PR4 baseline screenshots (manual)

Playwright auto-capture was **not possible** (admin session required; browser binaries not installed in CI/agent env).

Please capture in Chrome while logged in as admin:

| File | Content |
|------|---------|
| `01-admin-medias-list.png` | `/ko/admin/medias` 목록 + 필터 |
| `02-admin-medias-edit-full.png` | 목록에서 매체 「수정」 모달 전체 스크롤 stitch 또는 fullPage |
| `03-admin-medias-edit-legacy-fields-zoom.png` | 「선택 정보」~ CPM/가시성/노출 imp 구간 클ose-up |

Optional: `/ko/admin/medias/{id}/edit` JSON 편집 화면 (PR4 scope: JSON raw edit도 read-only 검토 필요).

After saving files here, notify in PR4 thread.
