# Aether — Cursor Motion

마우스 커서에 반응하는 Three.js / WebGL 메인 페이지입니다.

[Sougen](https://sougen.co/)의 시선 패럴랙스와 [LISA](https://lisa.locomotive.ca/en)의 대상 추적을 참고해, 한 화면에서 로봇이 커서를 따라보도록 만들었습니다.

**데모**

- Type 01 전신: [https://je-0.github.io/WebGl/](https://je-0.github.io/WebGl/)
- Type 02 상반신: [https://je-0.github.io/WebGl/index2.html](https://je-0.github.io/WebGl/index2.html)

## 타입

| 타입 | 페이지 | 구도 |
| --- | --- | --- |
| Type 01 | `index.html` | 전신, 오른쪽 배치 |
| Type 02 | `index2.html` | 상반신 클로즈업, 가운데 정렬 |

두 타입 모두 얼굴과 눈동자가 커서를 따라갑니다.

## 기능

- 커서를 바라보는 휴머노이드 로봇 (머리 / 상체 / 팔)
- 카메라 패럴랙스와 마우스 잔상
- 파티클, 블룸, 환경 셰이더
- 눈 깜빡임, 가슴 코어 점멸, 호버 모션
- 메인 페이지 전용 (스크롤 없음)

## 기술 스택

- [Three.js](https://threejs.org/) `^0.170.0` — WebGL 렌더
- [Vite](https://vitejs.dev/) `^6` — 로컬 개발 / 프로덕션 번들
- 커스텀 GLSL 셰이더 (환경, 파티클)
- GitHub Pages 배포

## 시작하기

Node.js 20 이상을 권장합니다.

```bash
npm install
npm run dev
```

- Type 01: [http://localhost:5173/](http://localhost:5173/)
- Type 02: [http://localhost:5173/index2.html](http://localhost:5173/index2.html)

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 로컬 개발 서버 |
| `npm run build` | GitHub Pages용 프로덕션 빌드 (`base: /WebGl/`) |
| `npm run preview` | 빌드 결과 미리보기 |

## 프로젝트 구조

```text
.
├── index.html                 # Type 01 전신
├── index2.html                # Type 02 상반신
├── src
│   ├── boot.js                # 공통 커서 / 부트
│   ├── main.js                # Type 01
│   ├── main2.js               # Type 02
│   ├── style.css
│   └── webgl
│       ├── Experience.js      # variant: full | bust
│       ├── Robot.js
│       └── shaders.js
├── public/.nojekyll
└── .github/workflows/deploy.yml
```

## 커스터마이즈

로봇 형태와 움직임은 `src/webgl/Robot.js`의 `update()`에서 조절합니다.

- 고개 회전 강도: `yaw`, `pitch`
- 호버 / 팔 움직임: `this.hover`, `this.armL`, `this.armR`
- 조명과 블룸: `src/webgl/Experience.js`

## GitHub Pages

이 저장소는 프로젝트 사이트 주소 `https://je-0.github.io/WebGl/` 를 사용합니다.

- 로컬 개발은 Vite가 `/`에서 제공합니다.
- `npm run build`는 자산 경로를 `/WebGl/`로 넣습니다.
- `main`에 푸시하면 `.github/workflows/deploy.yml`이 `dist`를 배포합니다.

Pages 설정은 아래 중 하나로 맞춥니다.

1. **GitHub Actions** (워크플로 사용)
2. **Deploy from a branch** → `gh-pages` / `/ (root)`

`main` 루트의 소스 HTML만 배포하면 `/src/main.js`를 사이트 최상위에서 찾아 404가 납니다.

## 라이선스

개인 / 학습용 프로젝트입니다.
