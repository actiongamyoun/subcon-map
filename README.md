# 사외협력사 안내 (Partner Route Guide)

조선소 사외협력사를 한눈에 보고, 협력사를 선택하면 **조선소 → 협력사 실제 도로 경로**가
지도 위에서 차량 애니메이션으로 표시됩니다. 협력사의 진행 아이템(공정·일정)은 **간트 타임라인**으로,
협력사 명단은 **프로젝트별로 골라 PDF 출력**할 수 있습니다.

- **프론트엔드**: Vite + React + **Leaflet (OpenStreetMap)** 지도
- **백엔드**: Vercel 서버리스 함수 → 카카오 모빌리티 길찾기 / 카카오 Local 좌표변환 / 구글시트(GAS) 프록시
- **데이터**: Google Sheets (Apps Script 웹앱)
- **배포**: Vercel

> 지도는 OpenStreetMap을 사용하므로 **카카오 지도 JS 키·웹도메인 등록·카카오맵 활성화가 필요 없습니다.**
> 광고 차단기에도 막히지 않습니다. 카카오는 길찾기/좌표변환용 REST 호출에만 서버에서 사용됩니다.
> 프론트는 same-origin `/api/*` 만 호출하므로 CORS 문제가 없고, 키는 모두 서버(환경변수)에 둡니다.

---

## ✨ 주요 기능

- 협력사 목록 → 선택 시 **실제 도로 경로** 리빌 + 차량 추적(줌인/팔로우) + 도착 거리 표시
- 협력사별 **진행 아이템 간트** (예정/진행중/완료, 착수·종료 예상일)
- **조선소 위치**, **협력사**(주소·분류·소개·아이템) 등록/수정/삭제 — 주소 입력 시 좌표 자동 검색
- **프로젝트**(다대다): 프로젝트별 체크박스로 협력사 지정 → **체크된 협력사만 PDF 출력**
- **무설정 데모**: 키/시트가 없어도 샘플 데이터 + 시뮬레이션 경로로 즉시 동작

---

## 🚀 빠른 시작 (로컬)

```bash
npm install
npm run dev          # http://localhost:5173  (샘플 데이터로 바로 확인)
```

> `npm run dev`(Vite)는 `/api/*` 서버리스 함수를 실행하지 않습니다.
> 이때 앱은 **자동으로 샘플 데이터 + 시뮬레이션 경로**로 동작합니다.
> 실제 길찾기/구글시트까지 로컬에서 테스트하려면 아래처럼 `vercel dev` 를 쓰세요.

```bash
npm i -g vercel
vercel dev           # /api/* 서버리스 함수까지 로컬 구동
```

`.env.example` 을 복사해 `.env` 로 만들고 키를 채우면 로컬에서도 실제 데이터/지도가 표시됩니다.

---

## 🔑 환경변수

지도(OpenStreetMap)는 키가 필요 없습니다. 아래 두 변수는 **모두 선택**이며, 없어도 앱은 동작합니다.

| 변수 | 위치 | 설명 |
|---|---|---|
| `KAKAO_REST_KEY` | 서버 | 카카오 **REST API 키** — 실제 도로 길찾기 + 주소→좌표 변환 (서버 전용, 미노출) |
| `GAS_URL` | 서버 | Google Apps Script 웹앱 배포 URL (구글시트 연동) |

두 변수 모두 `VITE_` 접두사가 없어 브라우저로 전달되지 않습니다.

### 키가 일부만 있을 때 동작
- **아무 것도 없음** → OpenStreetMap 지도 + 샘플 데이터 + 직선 시뮬레이션 경로(추정 거리). 바로 사용 가능.
- **`KAKAO_REST_KEY`만** → 지도 + 실제 도로 경로/거리/소요시간 + 주소 자동 좌표변환.
- **`GAS_URL`만** → 구글시트 실제 데이터(등록/수정 영구 저장) + 시뮬레이션 경로.
- **둘 다** → 실제 데이터 + 실제 도로 경로. (권장)

---

## 🗺️ 카카오 REST 키 발급 (선택)

지도 표시에는 필요 없고, **실제 도로 경로와 주소→좌표 변환**에만 쓰입니다.

1. [카카오 developers](https://developers.kakao.com) → 내 애플리케이션 생성(또는 기존 앱)
2. **앱 키**에서 `REST API 키` 복사 → Vercel `KAKAO_REST_KEY` 에 등록
3. 끝. **웹도메인 등록·카카오맵 활성화 같은 절차는 필요 없습니다** (REST 호출은 서버에서만 일어남).
   - 길찾기는 카카오모빌리티 `apis-navi.kakaomobility.com`, 좌표변환은 카카오 Local `dapi.kakao.com/v2/local` 을 사용합니다.

---

## 📊 구글시트 + Apps Script 배포

1. 데이터를 담을 **구글 스프레드시트**를 새로 만든다.
2. 상단 메뉴 **확장 프로그램 → Apps Script** 열기.
3. `gas/Code.gs` 내용을 전부 붙여넣고 저장.
4. **배포 → 새 배포 → 유형: 웹 앱**
   - 실행: **나**
   - 액세스 권한: **모든 사용자**
5. 발급된 **웹 앱 URL**(`.../exec`)을 Vercel 환경변수 `GAS_URL` 에 등록.

> 시트 3개(`조선소`, `협력사`, `프로젝트`)는 첫 호출 시 자동 생성됩니다.
> 협력사의 아이템(공정·일정)은 `협력사` 시트 `items` 칼럼에 JSON 으로 저장됩니다.

---

## ▲ Vercel 배포

1. 이 저장소를 GitHub 에 올리고 Vercel 에서 **Import**.
2. 프레임워크: **Vite** (자동 감지). 빌드 명령 `vite build`, 출력 `dist`.
3. **Settings → Environment Variables** 에 `KAKAO_REST_KEY`, `GAS_URL` 등록 (선택, 없어도 동작).
4. Deploy. (`/api/*` 는 자동으로 서버리스 함수로 배포됩니다.)
5. 끝 — 지도는 키 없이 바로 표시됩니다. (카카오 도메인 등록 같은 절차 없음)

---

## 🗂️ 폴더 구조

```
partner-route-guide/
├─ api/
│  ├─ data.js            # 구글시트(GAS) 프록시
│  ├─ directions.js      # 카카오 모빌리티 길찾기 프록시
│  └─ geocode.js         # 카카오 Local 주소→좌표 프록시
├─ gas/
│  └─ Code.gs            # 구글시트 백엔드 (Apps Script)
├─ src/
│  ├─ lib/
│  │  ├─ api.js          # /api 호출 + 샘플 폴백
│  │  ├─ kakao.js        # 주소→좌표 변환(/api/geocode 호출)
│  │  ├─ geo.js          # 거리/방위 + 경로 합성
│  │  ├─ constants.js    # 분류/상태/기본값
│  │  └─ sampleData.js   # 데모 데이터
│  ├─ components/
│  │  ├─ TopBar.jsx
│  │  ├─ ProjectBar.jsx
│  │  ├─ Sidebar.jsx
│  │  ├─ MapView.jsx     # Leaflet(OSM) 지도 + 경로 애니메이션
│  │  ├─ Gantt.jsx
│  │  ├─ Modal.jsx
│  │  ├─ YardModal.jsx
│  │  ├─ PartnerModal.jsx
│  │  ├─ ProjectModal.jsx
│  │  └─ PrintView.jsx   # 인쇄(PDF)용 명단
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ index.css
├─ index.html
├─ vite.config.js
├─ package.json
└─ .env.example
```

---

## 🧾 데이터 구조 (구글시트)

**조선소** — `name`, `addr`, `lat`, `lng` (한 행)

**협력사** — `id`, `name`, `cat`, `addr`, `desc`, `lat`, `lng`, `items`
- `cat`: `paint`(도장/방식) · `surf`(표면처리) · `mech`(기계가공) · `elec`(전장/배선) · `weld`(용접/구조) · `etc`
- `items`: `[{ "name","start","end","status" }]` JSON. `status`: `plan`·`prog`·`done`

**프로젝트** — `id`, `name`, `note`, `partnerIds`(쉼표 구분 협력사 id)

---

## 🖨️ PDF 출력

상단 **출력** 버튼 → ‘전체 협력사 명단’ 또는 ‘현재 프로젝트 명단’ 선택 시
브라우저 인쇄 창이 열립니다. 대상을 **PDF로 저장**으로 지정하면 한글이 깨지지 않는 PDF가 생성됩니다.
(번호 / 협력사명 / 분류 / 주소 / 한줄 소개 / 거리 칼럼)

---

## 메모

- 지도는 OpenStreetMap 타일(`tile.openstreetmap.org`)을 사용합니다. 무료이며 키가 필요 없고, 화면 우하단에 © OpenStreetMap 출처 표기가 표시됩니다(타일 이용 정책상 유지 권장). 트래픽이 매우 커지면 Carto·Stadia 등 무료 타일 제공자로 `tileLayer` URL만 바꾸면 됩니다.
- 협력사/조선소에 좌표가 없으면 주소를 `/api/geocode`(카카오 Local REST)로 변환합니다. `KAKAO_REST_KEY` 미설정이거나 변환 실패 시 모달에서 위도/경도를 직접 입력하면 됩니다. (대부분의 좌표는 시트에 저장돼 있어 표시엔 지장 없음)
- 거리값은 협력사를 한 번 선택해 경로가 계산된 뒤 카드/명단에 채워집니다.
