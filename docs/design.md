# 타워 디펜스 — 설계 문서

- **작성일**: 2026-07-22
- **목적**: 경로형 그리드 타워 디펜스 토이. 티스토리 블로그 iframe 임베드. 웨이브 생존 + 최고기록 경쟁.
- **상태**: MVP 구현 완료

## 1. 개요

적이 고정 경로를 따라 오고, 빈 칸에 타워를 설치·업그레이드해 막는 웨이브 생존(엔드리스+점수) 게임. 2026 인기 TD 트렌드(엔드리스+하이스코어, freeze·splash·single-target 빌드 다양성, 웨이브 스케일링)에 정렬. Vanilla JS + Canvas, 빌드/의존성 0, Node 20 `node:test`. idle-brick-breaker 스택 재사용.

## 2. 게임 규칙

- 가상 해상도 400×600(2:3). 상단 HUD 40px / 그리드(10×12, 셀 40px, y 40~520) / 하단 팔레트 80px.
- 적은 웨이포인트 경로를 따라 이동, 출구 통과 시 라이프 −1. 라이프 20 소진 → 게임오버.
- 타워 3종: **화살**(단일 타겟) / **대포**(광역 splash) / **서리**(감속 slow). 각 레벨 업그레이드(비용·데미지·사거리 성장).
- 골드: 처치 보상 + 웨이브 클리어 보너스 → 설치·업그레이드. 경로/점유/그리드밖 설치 불가.
- 점수 = 처치 수. 웨이브·처치 무한 스케일. 최고기록(best) 저장.

## 3. 아키텍처

**엔진은 DOM/네트워크를 모른다.** 순수 sim + Canvas 어댑터.

| 계층 | 모듈 | 책임 |
|---|---|---|
| 순수 | `config.js` | CONFIG + `enemyHP`,`towerStat` 성장 공식 |
| 순수 | `grid.js` | 셀↔픽셀, 경로 빌드, `canPlace` |
| 순수 | `enemy.js` | 스폰, 웨이포인트 이동, slow |
| 순수 | `tower.js` | 생성, 스탯, 비용 |
| 순수 | `targeting.js` | First 타겟(progressAlong), inRange |
| 순수 | `combat.js` | 쿨다운, hitscan 발사, splash/slow |
| 순수 | `wave.js` | 결정론 웨이브 계획 |
| 순수 | `economy.js` | 보상, 설치/업그레이드 |
| 순수 | `game.js` | 상태기계 `tick(dt)` |
| 순수 | `persistence.js` | best만 저장 |
| 어댑터 | `loop.js`(verbatim), `render.js`, `input.js`, `main.js` | 루프/그리기/입력/조립 |

- **타겟팅**: `progressAlong = wpIndex + 세그먼트 진행분`(단조증가). First = in-range·생존 중 최대, 동점은 최소 id.
- **투사체**: hitscan(즉시 명중) — 고정스텝 결정론·테스트 용이·splash 즉시 판정·성능. 이동 투사체는 roadmap.

## 4. 저장 계층

`createPersistence(storage)`(주입 + 메모리 폴백), KEY `tower-defense-save`. `SaveData = { version:1, best:{wave,score}, updatedAt }`. 런타임 보드 미저장(재시작 초기화, best만 유지). 미래 Supabase 리더보드는 같은 인터페이스로 교체.

## 5. 배포 & 임베드

GitHub Pages(main/root). 티스토리 iframe(400×600, aspect-ratio 2:3).

## 6. 에러 처리 & 견고성

- localStorage 불가 → 메모리 폴백. 저장 손상/버전 불일치 → 새 게임.
- 설치 불가 칸 거부. 탭 백그라운드 복귀 시 `MAX_FRAME` clamp + 다중 웨이포인트 leftover로 코너 터널링 방지.
- slow 만료는 `state.timeSec`(벽시계 아님) → 결정론.

## 7. 테스트

- 순수 모듈(config/grid/enemy/tower/targeting/combat/wave/economy/game/persistence + 순수 input helper) `node:test` 59 케이스.
- 헤드리스 밸런스 sim: 초반 생존성·HP 오버플로우·결정론 엔벨로프 검증(추측 대신 실측).
- Playwright E2E(라이브 URL, 9/9): 타워 설치·발사·처치·골드·업그레이드·라이프 감소.

## 8. 밸런스 (실측)

맨손 3웨이브(~100초) 생존 후 패배(즉사 아님) / 경로 옆 타워 몇 개면 8웨이브+ 생존 / 무한 스케일로 결국 패배. 초반 진입장벽·성장 곡선 적절.

## 9. 확장 포인트

이동 투사체, 타워·적 추가·특수능력, Supabase 하이스코어 리더보드, Next.js 이식 — 순수 sim·저장 인터페이스 뒤에서 흡수.
