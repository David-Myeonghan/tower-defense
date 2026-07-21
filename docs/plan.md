# 타워 디펜스 — 구현 플랜 (실행 기록)

TDD·태스크당 1커밋. 순수 모듈 `node:test`, 어댑터/통합 Playwright E2E(라이브). idle-brick-breaker 스캐폴딩(loop.js/persistence 패턴/toVirtual/fit/배포/커밋) 재사용.

## Global Constraints

- Vanilla JS ES 모듈, 빌드/의존성 0, Node 20(`.nvmrc` 20.20.2), `node:test`.
- Canvas 렌더, 가상 400×600. 그리드 10×12/셀40, 상단 HUD 40 / 하단 팔레트 80.
- 좌표·거리 모두 가상 px. 저장 KEY `tower-defense-save`, best만.

## Tasks (구현=커밋 순서)

- T0 scaffold(loop.js+loop.test.js verbatim) · T1 config+성장공식(6) · T2+T3 grid+경로+canPlace(13) · T4+T5 enemy 이동+slow(20) · T6 tower(24) · T7 targeting First(28) · T8 combat hitscan/splash/frost(36) · T9 wave(결정론) · T10 economy(place/upgrade) · T11 game tick 상태기계(50) · T12 persistence best(53) · T13 render · T14 input(순수 helper 테스트, 56) · T15 main 조립 · T16 헤드리스 밸런스 sim(59) · T17 docs+deploy.
- 총 59 node:test 그린.

## 실측 기록 (추측 금지 원칙)

- 적 경로 = 웨이포인트 배열(코너 셀 중심), lerp 이동: 검색 확인(Red Blob Games).
- 타겟팅 First(출구에 가까운 적) 기본, progressAlong=wpIndex+세그먼트 진행분 단조증가, 동점 최소 id: Bloons/TDS 표준 확인.
- hitscan 선택 근거: 고정스텝 결정론·테스트 용이·splash 즉시·성능.
- 밸런스 실측: 맨손 3웨이브(~100s) 패배, 경로옆 타워 몇 개면 8웨이브+ 생존, 무한 스케일 패배. HP 200웨이브도 유한.
- Playwright 라이브 E2E 9/9: 설치·발사·처치·골드·업그레이드·라이프 감소.

## Verification

- `npm test` 59 그린. 헤드리스 밸런스 엔벨로프. Playwright 라이브(디버그 hook `window.__td`로 상태 검증).
