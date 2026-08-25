/* =====================================================================
   이벤트 데이터 — 2026-08 모험 상점 (여정 속 나그네)
   - 이벤트마다 이 파일을 새로 만들고 index.html 의 <script src> 만 바꾸면 됨
   - qty  : 상품 1개 구매 시 받는 단위 수량
   - coin : 상품 1개 가격(코인)
   - type : hot(일일특가, 매일 daily 개 재공급) / rec(추천) / normal(일반)
   - stock: 이벤트 전체 잔여 (hot 은 daily 가 우선)
   ===================================================================== */
window.EVENT_DATA = {
  id: "2026-08",
  name: "모험 상점 · 여정 속 나그네",
  days: 5,                       // "4d 21h" → 5일
  shop: [
    { item:"pure_gold",              qty:58,   coin:30,  type:"hot",    daily:2 },
    { item:"universal_piece",        qty:12,   coin:50,  type:"hot",    daily:2 },
    { item:"hammer",                 qty:75,   coin:100, type:"hot",    daily:2 },
    { item:"mithril",                qty:1,    coin:40,  type:"rec",    stock:25 },
    { item:"legend_gear_chest",      qty:1,    coin:120, type:"rec",    stock:9 },
    { item:"universal_shard",        qty:1,    coin:10,  type:"normal", stock:300 },
    { item:"normal_gear_chest",      qty:30,   coin:50,  type:"normal", stock:30 },
    { item:"hammer",                 qty:30,   coin:50,  type:"normal", stock:30 },
    { item:"pure_gold",              qty:15,   coin:10,  type:"normal", stock:50 },
    { item:"design_sketch",          qty:28,   coin:20,  type:"normal", stock:100 },
    { item:"gold_thread",            qty:140,  coin:20,  type:"normal", stock:100 },
    { item:"silk",                   qty:14000,coin:20,  type:"normal", stock:100 },
    { item:"gem_blueprint",          qty:24,   coin:20,  type:"normal", stock:100 },
    { item:"gem_manual",             qty:24,   coin:20,  type:"normal", stock:100 },
    { item:"pet_food",               qty:4800, coin:20,  type:"normal", stock:50 },
    { item:"pet_breakthrough_chest", qty:7,    coin:25,  type:"normal", stock:50 },
    { item:"adv_training_record",    qty:10,   coin:100, type:"normal", stock:50 }
  ],
  // 과금 패키지 (매일 daily 회 구매 가능)
  // ⚠️ coin = 상단 줄 코인 아이콘 숫자(20/40/80…). 버튼 옆 큰 숫자(500/1,000…)는 코인이 아님.
  packages: [
    { id:"p1",  name:"일반 모험 코인 패키지 1", price:1500,   coin:20,   shell:20,   daily:1 },
    { id:"p2",  name:"일반 모험 코인 패키지 2", price:3000,   coin:40,  shell:40,   daily:1 },
    { id:"p3",  name:"일반 모험 코인 패키지 3", price:7500,   coin:80,  shell:80,   daily:1 },
    { id:"p4",  name:"고급 모험 코인 패키지",   price:15000,  coin:120,  shell:120,  daily:1 },
    { id:"p5",  name:"레어 모험 코인 패키지",   price:30000,  coin:200, shell:200,  daily:1 },
    { id:"p6",  name:"에픽 모험 코인 패키지",   price:79000,  coin:500, shell:500,  daily:1 },
    { id:"p7",  name:"레전드 모험 코인 패키지", price:149000, coin:1000, shell:1000, daily:3 }
  ],
  // 무료 코인 (매일)
  freeDaily:   { coin:5,  shell:5 },
  // 일일 특수훈련 (매일 완료 가정: 로그인 10 + 임의충전 5 + 야수10마리 5)
  dailyQuest:  { coin:20, shell:20 },
  // 보상2배 패키지 — 이벤트 중 1회, 특훈 코인만 2배
  doublePack:  { price:7500 },
  // 여정 속 나그네 — 최대 달성 가정 (200/1000/2000/3000 → 코인 5씩, 조개 5×5)
  journey:     { coin:20, shell:25 },
  // 상점포인트(조개) 누적 → 코인 보상 (구간별 1회)
  shellTiers: [
    { shell:50,   coin:25  }, { shell:200,  coin:75  }, { shell:500,  coin:150 },
    { shell:1000, coin:200 }, { shell:2000, coin:300 }, { shell:3000, coin:400 },
    { shell:5000, coin:600 }
  ]
};
