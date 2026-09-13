# 킹샷 웹앱 (KvK 통계 + 이벤트 효율계산기) — 작업 가이드

이 리포에는 GitHub Pages로 배포되는 **두 개의 정적 웹앱**이 있다. 백엔드 없음, 데이터는 JS 파일이 DB 역할.
사용자: Jason (연맹 [KOR]KeepersOfRoyal, 우리 서버 #737, 게임 내 이름 ✟ＪＡＳＯＮ✟).

## 배포
- GitHub Pages: main 브랜치 / root. push하면 곧 반영 (안 보이면 브라우저 강력 새로고침 Ctrl+Shift+R — Pages CDN 캐시).
- KvK 통계: https://jasonshin1hm.github.io/kingshot-kvk/kvk.html
- 이벤트 계산기: https://jasonshin1hm.github.io/kingshot-kvk/
- 두 앱은 상단 topnav로 상호 링크. 페이지를 추가하면 양쪽 topnav도 갱신할 것.

## 앱 ① KvK 통계 — `kvk.html` + `data.js`
매달 KvK(왕국 대전) 순위 통계. **월별 데이터 갱신은 data.js만 수정**하면 됨 (kvk.html은 로직 변경 시에만).

### data.js 스키마
```js
window.KVK_DATA = { kingdoms:[737,777], months:[ // months는 최신순 — 새 달을 배열 맨 앞에 삽입
  { id:"YYYY-MM", label:"YYYY년 M월", stage:"준비 단계",
    alliances:[{ tag,name,kingdom,power,members,kvk,in200 }], // 모르는 값은 null
    players:[{ rank,kingdom,tag,name,score }] } ] };
```
- 우리 서버는 항상 **#737**, 상대 서버는 매달 다름(3월 665, 4월 761, 7월 777, 8월 623, 9월 658) → 스샷의 # 배지에서 감지해 그대로 기록하면 앱이 상대 칩을 자동 갱신.
- 앱 자동 계산: Score/Power, Score/Player, In200th(개인 데이터 150명↑일 때만 kingdom+tag 매칭으로 자동 계산, 아니면 입력값 사용).
- 기능: 월 드롭다운 / 연맹·개인 탭 / 필터 칩(전체·#737·#상대·⚔️비교 인라인 뷰) / 연맹 이름 클릭 → 월별 추이 차트(KvK·Power·Score/Power·Score/Player·In200th) / 합계행 점수/전투력 = KvK합÷전투력합.

### 매달 KvK 업데이트 워크플로우
1. Jason이 게임 스크린샷 제공(zip/폴더/첨부). 종류: 연맹 포인트 랭킹 / 개인 포인트 랭킹 / 연맹정보(전투력·멤버수).
2. 분류 후 **개인순위 누락 구간이 있으면 분석 전에 먼저 보고** (상시 지침).
3. **연맹 랭킹 스샷은 필터 확인 필수**: 스테이지별(I~V) vs 누적(격자 아이콘) — **누적 기준으로 통일**, 혼재 시 누적만 사용.
4. OCR 규칙: 스샷 하단의 고정 골드행(본인 JASON, 매 스샷 반복)은 제외하되, 스크롤 목록 안의 실제 순위 행은 포함 / 잘린 행은 겹치는 스샷에서 취득 / 각 행 # 배지의 실제 왕국번호 기록 / 순위(rank)로 중복 제거 후 1~200 연속성 검증.
5. 이름 정리 관례: ✟·࿐ 제거, 전각영문→ASCII(NFKC), 공백 정리 (예: "✟ＪＡＳＯＮ✟"→"JASON").
6. data.js months 맨 앞에 새 달 삽입 → node로 파싱 검증(`window={}` 주입 후 require) → 브라우저/헤드리스로 kvk.html 열어 월 드롭다운·상대칩·행수·JS에러 확인 → commit+push.

### KvK 데이터 현황 (모두 2026년)
- **2026-09**: 연맹 12개(KvK만; 전투력·멤버 미확보), 개인 200명 완비. 상대 **#658**. 737=KOR/GGw/DOM/IMK/ICE, 658=MAD/GEA/END/WGL/AXE/EGL/DnD. 개인 1위 GEA Northurne 537M, JASON 6위 109M. in200 737=114 vs 86.
- **2026-08**: 연맹 9개(KOR·GGw·DOM·IMK·ICE는 전투력·멤버 있음), 개인 200명. 상대 #623.
- **2026-07**: 연맹 13개(풀데이터), 개인 200명. 상대 #777.
- **2026-06**: 개인 17명만. / **2026-05**: 연맹5+개인120. / **2026-04**: 연맹6+개인20, 상대 #761. / **2026-03**: 연맹6+개인178(22개 순위 누락), 상대 #665.

## 앱 ② 이벤트 과금효율 계산기 — `index.html` + `items.js` + `event-YYYY-MM.js` + `icons/`
킹샷 이벤트 상점(예: "모험 상점 · 여정 속 나그네")의 **현금 패키지 → 코인 → 아이템** 과금 효율 계산기. 예산(원) 입력 → 패키지 구성 추천("💳 예산 → 구성"), 구매 플랜(HOT → 추천 → 일반(코인 싼 순), 한도=일일재공급×일수 또는 잔여), 무료/일일특훈/여정 보상과 조개(상점포인트) 구간 보상까지 반영.

- **이벤트마다** `event-YYYY-MM.js`를 새로 만들고 `index.html`의 `<script src="event-....js">` 한 줄만 교체.
- `event-*.js` 스키마 (현재 event-2026-08.js 참조):
```js
window.EVENT_DATA = { id, name, days,
  shop:[{ item, qty, coin, type:"hot|rec|normal", daily?/stock? }], // hot=일일특가(daily개 재공급), 나머지는 stock=이벤트 전체 잔여
  packages:[{ id, name, price(원), coin, shell, daily }], // ⚠️ coin = 상단 코인 아이콘 숫자. 버튼 옆 큰 숫자(500/1,000…)는 코인 아님!
  freeDaily:{coin,shell}, dailyQuest:{coin,shell}, doublePack:{price}, // 보상2배: 이벤트 중 1회, 특훈 코인만 2배
  journey:{coin,shell}, shellTiers:[{shell,coin},…] }; // 조개 누적 구간 보상(구간별 1회)
```
- `items.js` = 이벤트와 무관한 **누적 아이템 마스터** `window.ITEMS = { id:{name,icon} }`. 새 아이템 등장 시 한 줄 추가 + `icons/`에 png 추가.
- 새 이벤트 워크플로우: Jason 스샷(상점 목록·패키지·잔여수량) → event-YYYY-MM.js 작성 → 새 아이템이면 items.js+아이콘 → index.html script src 교체 → 검증 → push.

## 남은 TODO
- 2026-09 연맹 전투력·멤버수 (연맹정보 스샷 받으면 data.js에 추가)
- 2026-08 상대(#623) 연맹 전투력·멤버 / 2026-03 누락 22개 순위 / 2026-04 21위~ / 2026-05·06 보완
- 전쟁 단계 데이터 (현재 준비 단계만 수집)
- `t4.mjs`는 불필요 파일 — 삭제해도 됨

## 기타
- KOR737 로고: `assets/` (light/dark/256 원본), 헤더용은 `logo.png`.
- 과거 클라우드 세션에서는 git push가 프록시로 차단돼 GitHub 웹 업로드로 우회했음. 이 로컬 환경에서는 해당 없음 — 직접 commit+push 하면 됨.
