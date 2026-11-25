/**
 * 성검쟁탈 편성표 — Apps Script 백엔드 v1
 *
 * v2 (2026-11-25): 주차 탭 아래 "글" 구역(공지·팀별 공지사항·단계·원칙을 시트에서 수정), 변경 감지용 sig, 확인 현황
 *
 * 배포: 코드 수정 시 반드시 "배포 관리 → 기존 배포 편집(연필) → 버전: 새 버전 → 배포"
 *       ("새 배포"를 누르면 URL이 바뀌어 사이트가 끊김)
 *
 * 데이터
 *  - 주차별 탭(예: "2026-11-25"): 팀별 참여자 명단. 팀마다 4열(역할·이름·R4·빈칸), 2행 = 팀 코드와 팀 이름, 3행 = 머리글, 4행부터 사람.
 *    이름·역할·R4만 고치면 사이트가 그대로 읽어 간다(임무 경로는 "몇 번째 줄"에 묶여 있어서 유지됨).
 *    탭을 복사해 이름을 바꾸면 새 주차가 된다(사이트 드롭다운에 자동으로 나옴).
 *  - 숨김 시트 "앱데이터": 주차별 나머지 편성 정보(JSON 조각) + 프로필 사진 모음(__faces__)
 *  - 계정·토큰: 스크립트 속성 ACCOUNTS / TOK_* (비밀번호는 솔트+반복 SHA-256 해시로만)
 */

var SPREADSHEET_ID = '1Al5z2mk1E3l_E-ItfIVgfgyp112D4UfgEF_uBKDiIlk';
var DATA_SHEET = '앱데이터';
var FACE_KEY = '__faces__';
var FREE_CODE = '프리롤';
var TOKEN_HOURS = 12;
var HASH_ROUNDS = 500;
var MAX_FAILS = 5;
var LOCK_MINUTES = 10;
var CHUNK = 45000;
var MARK = '¶'; // 조각 맨 앞에 붙여 시트가 수식·숫자로 바꾸지 못하게 함
var HELP = '이름·역할·R4만 바꾸면 사이트에 그대로 반영되고 임무 경로는 유지됩니다. 사람을 빼려면 이름 칸을 비우세요(그 자리의 임무카드도 사라집니다). 줄 순서와 2~3행은 바꾸지 마세요. 이 탭을 복사해서 이름을 바꾸면 새 주차가 됩니다.';
var TEXT_MARK = '■ 글';
var TEXT_HELP = '아래 "내용" 칸을 고치면 사이트에 반영됩니다. 종류·구분 칸은 그대로 두세요. 공지는 줄을 추가하면 늘어나고, 내용을 비우면 빠집니다.';
var SEEN_SHEET = '확인현황';
var COLORS = { '프리롤': '#F2C14E', 'A': '#E5484D', 'B': '#4C8DF0', 'C': '#3DB862', 'D': '#A066E8', 'E': '#17998E', 'S': '#94A3B8' };

// 초기 계정 (비밀번호 원문 없음 — 해시만). 공개 리포에는 해시도 올리지 않음: 실제 값은 Apps Script 편집기와 Jason 로컬 사본에만 있음
var INITIAL_ACCOUNTS = {
  'admin': { role: 'admin', salt: '__SALT__', hash: '__HASH__' }
};

/* ───────────────────────── HTTP ───────────────────────── */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'ping') return json_({ ok: true, time: new Date().toISOString() });
    if (p.action === 'list') return json_({ ok: true, weeks: weeks_() });
    if (p.action === 'sig') { var ws = weeks_(), wk = (p.week && ws.indexOf(String(p.week)) >= 0) ? String(p.week) : (ws[0] || null); return json_({ ok: true, weeks: ws, week: wk, sig: wk ? sig_(wk) : '' }); }
    return json_(load_(p.week));
  } catch (err) {
    return json_({ ok: false, error: 'server_error', message: String(err) });
  }
}

function doPost(e) {
  var b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  try {
    switch (b.action) {
      case 'login': return json_(login_(b.id, b.password));
      case 'whoami': return json_(whoami_(b.token));
      case 'logout': return json_(logout_(b.token));
      case 'save': return json_(save_(b.token, b.week, b.state, b.rev));
      case 'newWeek': return json_(newWeek_(b.token, b.week, b.from));
      case 'seen': return json_(seen_(b.week, b.name));
      case 'seenList': return json_(seenList_(b.token, b.week));
      case 'setPassword': return json_(setPassword_(b.token, b.target, b.newPassword));
      default: return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: 'server_error', message: String(err) });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function trim_(x) { return String(x == null ? '' : x).replace(/^\s+|\s+$/g, ''); }

/* ───────────────────────── 앱데이터(숨김 시트) ───────────────────────── */

function dataSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(DATA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(DATA_SHEET, ss.getNumSheets());
    sh.getRange('A:A').setNumberFormat('@');
    sh.getRange(1, 1, 1, 5).setValues([['주차', '리비전', '저장시각', '조각수', '내용(수정 금지)']]);
    sh.hideSheet();
  }
  return sh;
}
function dataRow_(key) {
  var sh = dataSheet_(), n = sh.getLastRow(); if (n < 2) return 0;
  var v = sh.getRange(2, 1, n - 1, 1).getDisplayValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(key)) return i + 2;
  return 0;
}
function readBlob_(key) {
  var r = dataRow_(key); if (!r) return null;
  var sh = dataSheet_(), h = sh.getRange(r, 1, 1, 4).getValues()[0], n = Number(h[3]) || 0; if (!n) return null;
  var parts = sh.getRange(r, 5, 1, n).getValues()[0], s = '';
  for (var i = 0; i < parts.length; i++) { var p = String(parts[i]); s += p.charAt(0) === MARK ? p.substr(1) : p; }
  return { rev: Number(h[1]) || 0, json: s };
}
function writeBlob_(key, str, rev) {
  var sh = dataSheet_(), r = dataRow_(key) || Math.max(sh.getLastRow(), 1) + 1, parts = [];
  for (var i = 0; i < str.length; i += CHUNK) parts.push(MARK + str.substr(i, CHUNK));
  if (!parts.length) parts.push(MARK);
  var maxc = sh.getMaxColumns();
  if (maxc < 4 + parts.length) { sh.insertColumnsAfter(maxc, 4 + parts.length - maxc); maxc = sh.getMaxColumns(); }
  sh.getRange(r, 5, 1, maxc - 4).clearContent();
  sh.getRange(r, 1).setNumberFormat('@');
  sh.getRange(r, 5, 1, parts.length).setNumberFormat('@');
  sh.getRange(r, 1, 1, 4).setValues([[String(key), rev, new Date(), parts.length]]);
  sh.getRange(r, 5, 1, parts.length).setValues([parts]);
}
function faces_() { var b = readBlob_(FACE_KEY); if (!b) return {}; try { return JSON.parse(b.json) || {}; } catch (err) { return {}; } }
function latestBlob_() {
  var sh = dataSheet_(), n = sh.getLastRow(); if (n < 2) return null;
  var v = sh.getRange(2, 1, n - 1, 3).getValues(), best = null, bt = -1;
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0]) === FACE_KEY) continue;
    var t = v[i][2] instanceof Date ? v[i][2].getTime() : 0;
    if (t >= bt) { bt = t; best = String(sh.getRange(i + 2, 1).getDisplayValue()); }
  }
  return best ? readBlob_(best) : null;
}

/* ───────────────────────── 주차 탭(팀별 명단) ───────────────────────── */

function isRosterSheet_(sh) {
  if (sh.getName() === DATA_SHEET || sh.getName() === SEEN_SHEET) return false;
  if (sh.getLastRow() < 3) return false;
  return trim_(sh.getRange(3, 1).getDisplayValue()) === '역할';
}
/** 탭 순서(왼쪽이 최신)대로 주차 이름 목록 */
function weeks_() {
  return ss_().getSheets().filter(isRosterSheet_).map(function (s) { return s.getName(); });
}
function eachRow_(state, fn) {
  (state.free || []).forEach(function (r) { fn(r); });
  (state.teams || []).forEach(function (t) { (t.rows || []).forEach(function (r) { fn(r); }); });
}
function blocks_(state) {
  var b = [{ code: FREE_CODE, name: state.freeTitle || FREE_CODE, rows: state.free || [] }];
  (state.teams || []).forEach(function (t) { b.push({ code: String(t.c), name: t.name || '', rows: t.rows || [] }); });
  return b;
}
function writeRoster_(week, state) {
  var ss = ss_(), sh = ss.getSheetByName(week);
  if (!sh) sh = ss.insertSheet(week, 0);
  var b = blocks_(state), maxRows = 0;
  b.forEach(function (x) { maxRows = Math.max(maxRows, x.rows.length); });
  var H = 3 + Math.max(maxRows, 1), W = b.length * 4, vals = [], r, c;
  for (r = 0; r < H; r++) { vals.push([]); for (c = 0; c < W; c++) vals[r].push(''); }
  vals[0][0] = HELP;
  b.forEach(function (x, j) {
    var c0 = j * 4;
    vals[1][c0] = x.code; vals[1][c0 + 1] = x.name;
    vals[2][c0] = '역할'; vals[2][c0 + 1] = '이름'; vals[2][c0 + 2] = 'R4';
    x.rows.forEach(function (p, i) { vals[3 + i][c0] = p.role || ''; vals[3 + i][c0 + 1] = p.name || ''; vals[3 + i][c0 + 2] = p.r4 ? 'R4' : ''; });
  });
  sh.clear();
  if (sh.getMaxColumns() < W) sh.insertColumnsAfter(sh.getMaxColumns(), W - sh.getMaxColumns());
  if (sh.getMaxRows() < H + 20) sh.insertRowsAfter(sh.getMaxRows(), H + 20 - sh.getMaxRows());
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setNumberFormat('@');
  sh.getRange(1, 1, H, W).setValues(vals);
  sh.getRange(1, 1).setFontColor('#666666').setFontSize(9).setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW);
  sh.getRange(2, 1, 2, W).setFontWeight('bold');
  b.forEach(function (x, j) {
    var c0 = j * 4 + 1;
    sh.getRange(2, c0, 1, 3).setBackground(COLORS[x.code] || '#DDDDDD').setFontColor(x.code === FREE_CODE ? '#201600' : '#FFFFFF');
    sh.getRange(3, c0, 1, 3).setBackground('#EEEEEE');
    sh.setColumnWidth(c0, 70); sh.setColumnWidth(c0 + 1, 150); sh.setColumnWidth(c0 + 2, 40); sh.setColumnWidth(c0 + 3, 16);
  });
  sh.setFrozenRows(3);
  writeTexts_(sh, H + 3, state);
}
function readRoster_(week) {
  var sh = ss_().getSheetByName(week); if (!sh || !isRosterSheet_(sh)) return null;
  var H = sh.getLastRow(), W = sh.getLastColumn(), v = sh.getRange(1, 1, H, Math.max(W, 3)).getDisplayValues(), out = [];
  var tm = textMarkRow_(v); if (tm >= 0) H = tm;
  for (var c = 0; c < W; c += 4) {
    var code = trim_(v[1][c]); if (!code) continue;
    var rows = [];
    for (var r = 3; r < H; r++) rows.push({ role: trim_(v[r][c]), name: trim_(v[r][c + 1]), r4: /\S/.test(String(v[r][c + 2] || '')) });
    while (rows.length && !rows[rows.length - 1].name) rows.pop();
    out.push({ code: code, name: trim_(v[1][c + 1]), rows: rows });
  }
  return out;
}
/* ── 글 구역: 명단 아래. A=종류, B=구분, C=내용 ── */
function msgLabel_(c) { return c === 'F' ? '프리롤' : c === 'N' ? '대체' : c + '팀'; }
function textRows_(state) {
  var rows = [['제목', '', state.title || ''], ['부제', '', state.sub || '']];
  (state.notes || []).forEach(function (t, i) { rows.push(['팀원용 공지', String(i + 1), t]); });
  (state.notesFree || state.notes || []).forEach(function (t, i) { rows.push(['프리롤용 공지', String(i + 1), t]); });
  (state.msgs || []).forEach(function (m) { rows.push(['팀별 공지사항', msgLabel_(m.c), m.text || '']); });
  (state.steps || []).forEach(function (t, i) { rows.push(['단계', String(i + 1), t]); });
  (state.rules || []).forEach(function (r) { rows.push(['운영 원칙', r[0], r[1]]); });
  (state.summary || []).forEach(function (r) { rows.push(['팀별 운영 요약', r[0], r[1]]); });
  return rows;
}
function writeTexts_(sh, r0, state) {
  var rows = textRows_(state), vals = [[TEXT_MARK, TEXT_HELP, ''], ['종류', '구분', '내용']].concat(rows), need = r0 + vals.length + 10;
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  sh.getRange(r0, 1, vals.length, 3).setValues(vals).setVerticalAlignment('top');
  sh.getRange(r0, 1, 1, 3).setFontWeight('bold').setBackground('#333333').setFontColor('#FFFFFF');
  sh.getRange(r0 + 1, 1, 1, 3).setFontWeight('bold').setBackground('#EEEEEE');
  sh.getRange(r0 + 2, 1, rows.length, 2).setFontColor('#666666');
  sh.getRange(r0, 2, vals.length, 2).setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW);
}
/** 화면값 2차원 배열에서 글 구역 시작 줄(0부터) — 없으면 -1 */
function textMarkRow_(v) { for (var r = 3; r < v.length; r++) if (trim_(v[r][0]) === TEXT_MARK) return r; return -1; }
function readTexts_(week) {
  var sh = ss_().getSheetByName(week); if (!sh) return null;
  var H = sh.getLastRow(); if (H < 4) return null;
  var v = sh.getRange(1, 1, H, 3).getDisplayValues(), tm = textMarkRow_(v); if (tm < 0) return null;
  var out = [];
  for (var r = tm + 2; r < H; r++) { var ty = trim_(v[r][0]); if (ty) out.push([ty, trim_(v[r][1]), String(v[r][2] || '').replace(/\s+$/, '')]); }
  return out;
}
function mergeTexts_(state, rows) {
  function of(ty) { return rows.filter(function (x) { return x[0] === ty; }); }
  var t = of('제목')[0], s = of('부제')[0];
  if (t) state.title = t[2]; if (s) state.sub = s[2];
  state.notes = of('팀원용 공지').map(function (x) { return x[2]; }).filter(function (x) { return x; });
  state.notesFree = of('프리롤용 공지').map(function (x) { return x[2]; }).filter(function (x) { return x; });
  var ms = of('팀별 공지사항'); (state.msgs || []).forEach(function (m, i) { if (ms[i]) m.text = ms[i][2]; });
  var st = of('단계'); if (st.length) state.steps = st.map(function (x) { return x[2]; }).filter(function (x) { return x; });
  var ru = of('운영 원칙'); if (ru.length) state.rules = ru.filter(function (x) { return x[1] || x[2]; }).map(function (x) { return [x[1], x[2]]; });
  var su = of('팀별 운영 요약'); if (su.length) state.summary = su.filter(function (x) { return x[1] || x[2]; }).map(function (x) { return [x[1], x[2]]; });
  return state;
}
/** 변경 감지용 서명: 탭에 보이는 값 전체 + 리비전 */
function sig_(week) {
  var sh = ss_().getSheetByName(week), b = readBlob_(week), txt = '';
  if (sh && sh.getLastRow() > 0) txt = JSON.stringify(sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), 1)).getDisplayValues());
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, txt + '|' + (b ? b.rev : 0), Utilities.Charset.UTF_8));
}

/** 탭의 명단을 편성 정보에 덮어씀. 줄 위치가 같으면 같은 자리(id 유지 → 임무 경로 유지) */
function mergeRoster_(state, roster) {
  if (!state.teams) state.teams = [];
  roster.forEach(function (b) {
    var list, team = null;
    if (b.code === FREE_CODE) { list = state.free || []; if (b.name) state.freeTitle = b.name; }
    else {
      team = state.teams.filter(function (t) { return String(t.c) === b.code; })[0];
      if (!team) { team = { c: b.code, name: b.name || (b.code + '팀'), rows: [] }; state.teams.push(team); }
      if (b.name) team.name = b.name;
      list = team.rows || [];
    }
    var out = [];
    b.rows.forEach(function (r, i) {
      if (!r.name) return;
      var row = list[i];
      if (row) { if (row.name !== r.name) { row.name = r.name; row.face = ''; } }
      else row = { id: 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), role: b.code === FREE_CODE ? '프리롤' : '팀원', name: r.name, face: '' };
      if (r.role) row.role = r.role;
      if (r.r4) row.r4 = true; else delete row.r4;
      out.push(row);
    });
    if (team) team.rows = out; else state.free = out;
  });
  var ids = {}; eachRow_(state, function (r) { ids[r.id] = 1; });
  state.missions = (state.missions || []).filter(function (m) { return String(m.pid).indexOf('T:') === 0 || ids[m.pid]; });
  return state;
}

/* ───────────────────────── 읽기 / 저장 ───────────────────────── */

function load_(week) {
  var ws = weeks_();
  week = (week && ws.indexOf(String(week)) >= 0) ? String(week) : (ws[0] || null);
  var blob = week ? readBlob_(week) : null, own = !!blob;
  if (!blob) blob = latestBlob_();
  if (!blob) { // 아직 저장된 편성이 없음: 비어 있는 첫 탭 이름을 첫 주차 이름으로 제안
    var first = ss_().getSheets().filter(function (s) { return s.getName() !== DATA_SHEET; })[0];
    return { ok: true, empty: true, weeks: ws, week: week || (first ? first.getName() : null) };
  }
  var state = JSON.parse(blob.json), roster = week ? readRoster_(week) : null;
  if (roster) mergeRoster_(state, roster);
  var texts = week ? readTexts_(week) : null;
  if (texts) mergeTexts_(state, texts);
  var faces = faces_();
  eachRow_(state, function (r) { r.face = faces[r.name] || ''; });
  return { ok: true, weeks: ws, week: week, rev: own ? blob.rev : 0, sig: week ? sig_(week) : '', state: state };
}

function store_(week, state, rev) {
  var faces = faces_(), copy = JSON.parse(JSON.stringify(state));
  eachRow_(copy, function (r) {
    var nm = trim_(r.name);
    if (r.face && /^data:image\//.test(r.face)) { if (nm) faces[nm] = r.face; }
    else if (nm && faces[nm]) delete faces[nm];
    r.face = '';
  });
  writeBlob_(FACE_KEY, JSON.stringify(faces), 0);
  writeBlob_(week, JSON.stringify(copy), rev);
  writeRoster_(week, copy);
  var ss = ss_(), blank = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(blank);
}
function badWeekName_(w) { return !w || w.length > 60 || w === DATA_SHEET || /[\[\]\*\?\/\\:]/.test(w); }

function save_(token, week, state, rev) {
  if (!requireAdmin_(token)) return { ok: false, error: 'auth' };
  week = trim_(week);
  if (badWeekName_(week)) return { ok: false, error: 'bad_week' };
  if (!state || typeof state !== 'object' || !state.teams) return { ok: false, error: 'bad_state' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var cur = readBlob_(week);
    if (cur && rev != null && Number(rev) !== cur.rev) { var fresh = load_(week); fresh.ok = false; fresh.error = 'conflict'; return fresh; }
    var next = (cur ? cur.rev : 0) + 1;
    store_(week, state, next);
    return { ok: true, rev: next, week: week, weeks: weeks_(), sig: sig_(week) };
  } finally { lock.releaseLock(); }
}

function newWeek_(token, week, from) {
  if (!requireAdmin_(token)) return { ok: false, error: 'auth' };
  week = trim_(week);
  if (badWeekName_(week)) return { ok: false, error: 'bad_week' };
  if (ss_().getSheetByName(week)) return { ok: false, error: 'exists' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var base = load_(from);
    if (!base.state) return { ok: false, error: 'no_base' };
    base.state.saved = Date.now();
    store_(week, base.state, 1);
    return { ok: true, rev: 1, week: week, weeks: weeks_() };
  } finally { lock.releaseLock(); }
}

/* ───────────────────────── 확인 현황 ───────────────────────── */

function seenSheet_() {
  var ss = ss_(), sh = ss.getSheetByName(SEEN_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SEEN_SHEET, ss.getNumSheets());
    sh.getRange('A:B').setNumberFormat('@');
    sh.getRange(1, 1, 1, 5).setValues([['주차', '이름', '처음 확인', '마지막 확인', '횟수']]).setFontWeight('bold');
  }
  return sh;
}
/** 연맹원이 이름을 고르면 기록 (로그인 불필요, 그 주차 명단에 있는 이름만) */
function seen_(week, name) {
  week = trim_(week); name = trim_(name);
  if (!week || !name || name.length > 60) return { ok: false, error: 'bad' };
  var ro = readRoster_(week); if (!ro) return { ok: false, error: 'no_week' };
  var known = false; ro.forEach(function (b) { b.rows.forEach(function (r) { if (r.name === name) known = true; }); });
  if (!known) return { ok: false, error: 'unknown' };
  var lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    var sh = seenSheet_(), n = sh.getLastRow(), now = new Date();
    if (n >= 2) {
      var v = sh.getRange(2, 1, n - 1, 5).getDisplayValues();
      for (var i = 0; i < v.length; i++) if (v[i][0] === week && v[i][1] === name) {
        sh.getRange(i + 2, 4, 1, 2).setValues([[now, (Number(v[i][4]) || 0) + 1]]); return { ok: true };
      }
    }
    sh.getRange(n + 1, 1, 1, 2).setNumberFormat('@');
    sh.getRange(n + 1, 1, 1, 5).setValues([[week, name, now, now, 1]]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function seenList_(token, week) {
  if (!requireAdmin_(token)) return { ok: false, error: 'auth' };
  var sh = seenSheet_(), n = sh.getLastRow(), out = {};
  if (n >= 2) sh.getRange(2, 1, n - 1, 5).getValues().forEach(function (r) {
    if (String(r[0]) === String(week)) out[String(r[1])] = { first: r[2] instanceof Date ? r[2].getTime() : 0, last: r[3] instanceof Date ? r[3].getTime() : 0, count: Number(r[4]) || 0 };
  });
  return { ok: true, week: week, seen: out };
}

/* ───────────────────────── 계정 / 인증 ───────────────────────── */

function props_() { return PropertiesService.getScriptProperties(); }
function accounts_() {
  var p = props_(), raw = p.getProperty('ACCOUNTS');
  if (raw) return JSON.parse(raw);
  var acc = JSON.parse(JSON.stringify(INITIAL_ACCOUNTS));
  p.setProperty('ACCOUNTS', JSON.stringify(acc));
  return acc;
}
function saveAccounts_(acc) { props_().setProperty('ACCOUNTS', JSON.stringify(acc)); }
function hex_(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) { var b = (bytes[i] + 256) % 256; s += (b < 16 ? '0' : '') + b.toString(16); } return s; }
function sha_(str) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8)); }
function hashPassword_(salt, pw) { var h = sha_(salt + ':' + pw); for (var i = 1; i < HASH_ROUNDS; i++) h = sha_(h + salt); return h; }
function safeEqual_(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
function newSalt_() { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now()).slice(0, 16)); }

function login_(id, password) {
  id = String(id || '').trim().toLowerCase(); password = String(password || '');
  var cache = CacheService.getScriptCache(), failKey = 'FAIL_' + id, fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_FAILS) return { ok: false, error: 'locked', minutes: LOCK_MINUTES };
  var acc = accounts_(), rec = acc[id];
  if (!(rec && safeEqual_(hashPassword_(rec.salt, password), rec.hash))) {
    cache.put(failKey, String(fails + 1), LOCK_MINUTES * 60);
    return { ok: false, error: 'invalid' };
  }
  cache.remove(failKey); cleanupTokens_();
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  var exp = Date.now() + TOKEN_HOURS * 3600 * 1000;
  props_().setProperty('TOK_' + token, JSON.stringify({ id: id, exp: exp }));
  return { ok: true, id: id, role: rec.role, token: token, exp: exp };
}
function checkToken_(token) {
  if (!token) return null;
  var raw = props_().getProperty('TOK_' + token); if (!raw) return null;
  var t = JSON.parse(raw);
  if (Date.now() > t.exp) { props_().deleteProperty('TOK_' + token); return null; }
  var a = accounts_()[t.id]; if (!a) return null;
  return { id: t.id, role: a.role };
}
function requireAdmin_(token) { var a = checkToken_(token); return a && a.role === 'admin' ? a : null; }
function whoami_(token) { var a = checkToken_(token); return a ? { ok: true, id: a.id, role: a.role } : { ok: false, error: 'auth' }; }
function logout_(token) { if (token) props_().deleteProperty('TOK_' + token); return { ok: true }; }
function cleanupTokens_() {
  var all = props_().getProperties(), now = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('TOK_') !== 0) return;
    try { if (JSON.parse(all[k]).exp < now) props_().deleteProperty(k); } catch (err) { props_().deleteProperty(k); }
  });
}
/** 관리자만: 비밀번호 변경 */
function setPassword_(token, target, newPassword) {
  var me = requireAdmin_(token); if (!me) return { ok: false, error: 'auth' };
  target = String(target || me.id).trim().toLowerCase(); newPassword = String(newPassword || '');
  if (newPassword.length < 4) return { ok: false, error: 'weak' };
  var acc = accounts_(); if (!acc[target]) return { ok: false, error: 'no_account' };
  var salt = newSalt_(); acc[target].salt = salt; acc[target].hash = hashPassword_(salt, newPassword); saveAccounts_(acc);
  return { ok: true, target: target };
}

/** 편집기에서 한 번 실행해 권한을 승인하고 시트 연결을 확인 */
function setup() {
  dataSheet_(); accounts_();
  Logger.log('연결 확인: ' + ss_().getName() + ' / 주차 ' + JSON.stringify(weeks_()));
}
