# PR5 production recompute API verify

**Timestamp**: 2026-08-14T11:54:08.321Z
**Endpoint**: POST https://tkad.co.kr/api/admin/medias/cmnz82khn000004kzmu9sap6n/recompute
**PR5 merged**: main deployed on tkad.co.kr

## Request

```bash
curl -X POST https://tkad.co.kr/api/admin/medias/cmnz82khn000004kzmu9sap6n/recompute \
  -H "Cookie: {admin session}"
```

## Response

**HTTP Status**: 200

```json
{
  "mediaId": "cmnz82khn000004kzmu9sap6n",
  "engineVersion": "v0-fallback",
  "computedAt": "2026-08-14T11:54:08.340Z",
  "changed": {
    "dailyImpressions": false,
    "cpm": false
  },
  "before": {
    "dailyImpressions": 180000,
    "cpm": 93333,
    "modelVersion": "v0-fallback"
  },
  "after": {
    "dailyImpressions": 180000,
    "cpm": 93333,
    "modelVersion": "v0-fallback"
  }
}
```

## Expectations

| Check | Expected | Actual | Pass |
|-------|----------|--------|:----:|
| HTTP status | 200 | 200 | ✓ |
| engineVersion | v0-fallback | v0-fallback | ✓ |
| changed.dailyImpressions | false | false | ✓ |
| changed.cpm | false | false | ✓ |

**Overall**: PASS