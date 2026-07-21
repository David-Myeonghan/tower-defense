# 타워 디펜스 · Tower Defense

경로형 그리드 타워 디펜스. 웨이브 생존(엔드리스+점수). Vanilla JS + Canvas, 빌드/의존성 없음.

- 적이 고정 경로를 따라 오고, 빈 칸에 타워를 설치해 막는다.
- 타워 3종: 화살(단일 타겟) / 대포(광역) / 서리(감속).
- 라이프가 0이 되면 게임오버. 웨이브를 오래 버틸수록 고득점.

## 로컬 실행

```bash
nvm use          # .nvmrc → Node 20
npm run serve
```

## 테스트

```bash
npm test         # Node 20 내장 test runner
```

## 배포 (라이브)

**플레이: https://david-myeonghan.github.io/tower-defense/**

GitHub Pages(main/root). `git push`하면 자동 갱신.

## 티스토리 임베드

HTML 편집 모드에서:

```html
<iframe src="https://david-myeonghan.github.io/tower-defense/"
        width="400" height="600"
        style="border:0;max-width:100%;aspect-ratio:2/3" loading="lazy"></iframe>
```

## 문서

- 설계: [docs/design.md](docs/design.md)
- 구현 플랜: [docs/plan.md](docs/plan.md)
- 발전 계획: [docs/roadmap.md](docs/roadmap.md)
