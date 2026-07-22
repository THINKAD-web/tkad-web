# Verify: JSON / bulk-import installLocations

| Check | Result |
|-------|--------|
| Export from media with installs | exportOk=true (2 points) |
| Persist add-point + restore | writeOk=true, restoreOk=true |
| JSON without key (regression) | regressionOk=true |
| Centroid on mapQuickAddToDb | ok |
| Unit tests | 5 pass |
| Build | pass |

Sample: `cmqruwydr00010bj8vetag2sj` (인천국제공항 키로뷰 Full Package)

Artifacts: `report.json`, `preview.html`, `preview-focus.html`, `json-edit-installLocations.png`
