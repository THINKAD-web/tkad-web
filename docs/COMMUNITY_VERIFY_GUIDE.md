# 커뮤니티 MVP 검증 가이드

마지막 업데이트: 홈 featured 섹션 + `/api/community/posts/featured` 기준.

## 라우트 참고

- 홈: `app/[locale]/page.tsx` (레이아웃 그룹 `(main)` 은 사용하지 않음)
- 커뮤니티: `/[locale]/community`, 글 상세 `/[locale]/community/post/[id]`, 멤버 `/[locale]/community/members`, 프로필 `/[locale]/community/profile/[id]`, 가입 `/[locale]/register`

## API

### Featured 글 (홈·외부 연동)

```http
GET /api/community/posts/featured?sortBy=popular&limit=3
GET /api/community/posts/featured?sortBy=latest&limit=3
```

- 응답: `{ posts: CommunityPostListItem[], sortBy: "popular" | "latest" }`
- `sortBy=popular` 이고 **공개(`published`) 글이 5개 미만**이면, 응답의 `sortBy` 는 자동으로 `latest` 로 바뀌고 최신순 3개가 내려감.
- `sortBy=latest` 는 항상 `createdAt` 내림차순.
- DB 미연결·스키마 불일치 등: `posts: []` + `sortBy` (요청값) 로 200 degrade.

### 기타

- 글 목록/작성: 기존 `/api/community/posts` 등 유지.

## 홈 UI

- **위치**: 후기(Testimonials, `05`) 섹션 다음, 최하단 CTA 배너 직전.
- **섹션 번호**: `06` — Community / meta `ooh industry network`
- **카드**: 브루탈 `border-2 border-black`, 카테고리 뱃지 `#FF6600`, 제목 2줄 말줄임, 작성자 + `RoleBadge`, 좋아요·댓글 수, 상대 시각.
- **CTA**: `커뮤니티 전체 보기 →` → `/community`, `멤버로 참여하기 →` → `/register` (로케일은 `Link` 가 접두 처리).

## 수동 검증 체크리스트

1. `GET /api/community/posts/featured?sortBy=popular` → 200, `posts` 최대 3개, 글 5개 이상일 때 좋아요 상위 경향.
2. 공개 글 5개 미만 DB에서 `sortBy=popular` 호출 → 응답 `sortBy` 가 `latest` 인지, 순서가 최신인지.
3. `GET ...?sortBy=latest` → 최신순.
4. 브라우저: `/ko` 에서 커뮤니티 섹션 카드 3개(또는 empty 카피), 두 링크 동작.
5. 모바일 뷰포트에서 카드 1열 스택.

## 서버 데이터

- 홈 섹션 데이터는 `listHomeCommunityPosts()` → 내부적으로 `listFeaturedCommunityPosts({ limit: HOME_SECTION_SIZE, sortBy: "popular" })` 와 동일 규칙.
