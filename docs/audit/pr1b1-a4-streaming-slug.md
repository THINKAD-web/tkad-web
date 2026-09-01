# PR1b-1 — A4 Streaming Slug Separation

**Date**: 2026-09-01  
**Scope**: Documentation only (no code change)

---

## Problem

Two distinct concepts share the word "streaming":

| Axis | Location | Slug | Prod rows |
|------|----------|------|-----------|
| **OOH browse** | `entertainment` / `streaming` | OTT/스트리밍 venue type | **0** |
| **Online catalog** | `video` main (PR1b-1) | YouTube, in-stream ads | **0** (PR3 seed) |

Future confusion if online video products reuse `streaming` under an online main.

---

## Rules (PR3 seed + PR4 UI)

1. **OOH** `entertainment/streaming` — unchanged; for physical OTT/venue inventory if ever added.
2. **Online video** — use browse main **`video`** only.
3. **`streaming` slug MUST NOT** appear under online mains or `media_sub_category` for online rows.
4. PR3 slugs `yt-awareness`, `youtube-action` → `media_main_category='video'`, **not** `entertainment/streaming`.

---

## Reference

- OOH sub definition: ```101:101:lib/media-browse-categories.ts```
- Online mains: ```lib/online-browse-mains.ts```
