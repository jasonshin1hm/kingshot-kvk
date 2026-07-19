/* =====================================================================
   킹샷 KvK 데이터 (DB 역할)
   - 매달 KvK가 끝나면 이 파일에 달(month) 하나를 추가하면 됩니다.
   - power(전투력) / members(멤버수) / in200(200위 내 인원)은
     스크린샷 확인 후 채워 넣으면 됩니다. 모르면 null 로 두세요.
   - kvk = KvK Score (준비단계 연맹 포인트)
   ===================================================================== */
window.KVK_DATA = {
  kingdoms: [737, 777],           // 이번 KvK 대진(두 왕국)
  months: [
    {
      id: "2026-07",
      label: "2026년 7월",
      stage: "준비 단계",
      // 연맹 랭킹
      alliances: [
        { tag:"KOR", name:"KeepersOfRoyal",   kingdom:737, power:null, members:null, kvk:3028484143, in200:null },
        { tag:"LOV", name:"LotsOfViolence",   kingdom:777, power:null, members:null, kvk:2539930107, in200:null },
        { tag:"BFS", name:"AllianceNotFound", kingdom:777, power:null, members:null, kvk:2421853349, in200:null },
        { tag:"GGw", name:"칼찌클럽",          kingdom:737, power:null, members:null, kvk:2118221422, in200:null },
        { tag:"GLO", name:"GloRassicPark",    kingdom:777, power:null, members:null, kvk:1949084621, in200:null },
        { tag:"DOM", name:"Kumdom",           kingdom:737, power:null, members:null, kvk:1101477519, in200:null },
        { tag:"KOR", name:"WAVE",             kingdom:777, power:null, members:null, kvk:965434486,  in200:null },
        { tag:"ICE", name:"IcyCrownEmpire",   kingdom:737, power:null, members:null, kvk:280696158,  in200:null },
        { tag:"404", name:"BreakfastSpread",  kingdom:777, power:null, members:null, kvk:null,        in200:null },
        { tag:"MOO", name:"MorningOfOwl",     kingdom:777, power:null, members:null, kvk:186142543,  in200:null },
        { tag:"ALL", name:"LOVE",             kingdom:777, power:null, members:null, kvk:185313654,  in200:null },
        { tag:"HAN", name:"JANHAE",           kingdom:737, power:null, members:null, kvk:130954842,  in200:null },
        { tag:"kor", name:"KOR농장",          kingdom:777, power:null, members:null, kvk:100877751,  in200:null }
      ],
      // 개인 랭킹 (스크린샷 들어오면 채움)
      // { rank, name, tag, kingdom, power, kvk }
      players: []
    }
  ]
};
