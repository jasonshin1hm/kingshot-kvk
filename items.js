/* =====================================================================
   아이템 마스터 (이벤트와 무관, 누적)
   - 새 아이템이 나오면 여기에 한 줄 추가 + icons/ 에 아이콘 파일 추가
   - id 는 이벤트 데이터(event-*.js)의 shop.item 에서 참조
   ===================================================================== */
window.ITEMS = {
  pure_gold:              { name:"순금",         icon:"icons/pure_gold.png" },
  hammer:                 { name:"망치",         icon:"icons/hammer.png" },
  universal_piece:        { name:"공용조각",     icon:"icons/universal_piece.png" },
  universal_shard:        { name:"공용섬조각",   icon:"icons/universal_shard.png" },
  mithril:                { name:"미스릴",       icon:"icons/mithril.png" },
  legend_gear_chest:      { name:"레전드장비상자", icon:"icons/legend_gear_chest.png" },
  normal_gear_chest:      { name:"일반장비상자", icon:"icons/normal_gear_chest.png" },
  design_sketch:          { name:"설계스케치",   icon:"icons/design_sketch.png" },
  gold_thread:            { name:"금사",         icon:"icons/gold_thread.png" },
  silk:                   { name:"비단",         icon:"icons/silk.png" },
  gem_blueprint:          { name:"보석도면",     icon:"icons/gem_blueprint.png" },
  gem_manual:             { name:"보석매뉴얼",   icon:"icons/gem_manual.png" },
  pet_food:               { name:"펫먹이",       icon:"icons/pet_food.png" },
  pet_breakthrough_chest: { name:"펫돌파상자",   icon:"icons/pet_breakthrough_chest.png" },
  adv_training_record:    { name:"고급훈련기록", icon:"icons/adv_training_record.png" }
};
