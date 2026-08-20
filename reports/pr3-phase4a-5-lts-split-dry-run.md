# Phase 4a-5 LTS/impressions split — dry-run

생성: 2026-08-20T02:50:21.304Z

## Overall
**✅ PASS**

## 1. wrap-only (회귀 없음)
| | legacy | current |
|---|-----:|--------:|
| netReach | 685,398 | 685,398 |
| frequency | 13.94 | 13.94 |
| impressions | 9,555,000 | 9,555,000 |

checks: reachUnchanged=✅, frequencyUnchanged=✅, impressionsUnchanged=✅, reachRateLe1=✅, netReachLeTarget=✅, netReachLeCoverage=✅, tryCalcReachOk=✅, rho=✅

**PASS**

## 2. loop-only (reach ↑, frequency ↓)
| | legacy | current |
|---|-----:|--------:|
| netReach | 240,094 | 1,620,983 |
| frequency | 7.82 | 1.16 |
| impressions | 1,877,400 | 1,877,400 |

checks: impressionsUnchanged=✅, reachIncreased=✅, frequencyDecreased=✅, reachRateLe1=✅, netReachLeTarget=✅, netReachLeCoverage=✅, tryCalcReachOk=✅, rho=✅

**PASS**

## 3. 4a-4 mix (freq ~11)
| | legacy | current |
|---|-----:|--------:|
| netReach | 936,672 | 1,804,376 |
| frequency | 21.80 | 11.32 |
| impressions | 20,418,062 | 20,418,062 |

checks: freqNearHybrid=✅, reachRestored=✅, reachRateLe1=✅, netReachLeTarget=✅, netReachLeCoverage=✅, tryCalcReachOk=✅, rho=✅

**PASS**

JSON: `reports/pr3-phase4a-5-lts-split-dry-run.json`
