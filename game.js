// 畫面：HD-2D 像素足球場動畫、記分板、戰術板、文字轉播、比賽數據、球員名單、賽制規則（中文 / English）
// The page: the HD-2D pixel pitch, scoreboard, playbook, play-by-play, box score, rosters and the rules of each format.
(function () {
'use strict';
const { FORMATS, TACTICS, POS_NAME, Game, makeMatch, addStars, parseForm, slotSpot, newStats, ovr } = SOCCER;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------- text ----------------
const TX = {
  zh: {
    title: '像素足球', subtitle: '依球員能力與戰術全自動模擬的足球比賽', speed: '速度', play: '▶ 開球', pause: '⏸ 暫停', resume: '▶ 繼續',
    sim: '⏭ 直接模擬到結束', next: '下一場 ▶', newTeams: '🔄 重新組隊', lang: 'English', fx: on => '✨ HD-2D 特效：' + (on ? '開' : '關'), format: '賽制',
    tabLog: '文字轉播', tabBox: '比賽數據', tabRoster: '球員名單', tabRules: '賽制規則',
    period: (n, F) => F.periods === 4 ? '第 ' + n + ' 節' : (n === 1 ? '上半場' : '下半場'), final: '全場結束', half: '中場休息',
    rec: (w, d, l) => w + ' 勝 ' + d + ' 和 ' + l + ' 敗', onBall: '持球', marking: '防守中',
    rt: { pac: '速度', sho: '射門', pas: '傳球', dri: '盤帶', def: '防守', phy: '身體', gk: '撲救', sta: '體力' },
    today: '本場', energy: '體力', total: '全隊', player: '球員', pos: '位', ovr: '總評',
    playbook: '戰術板', playLabel: '戰術', playRun: '戰術：', pbWait: '開球後，這裡會畫出每一波進攻的戰術路線。',
    pbLegend: '虛線＝傳球　實線＝盤帶　點線＝無球跑動　紅線＝射門　金色＝射手', formation: '陣型', press: { high: '高位逼搶', mid: '中場防守', low: '低位防守' },
    stats: { POS: '控球率', SH: '射門', SOT: '射正', CK: '角球', FL: '犯規', OFF: '越位', YC: '黃牌', RC: '紅牌', PA: '傳球成功率', XG: '預期進球 xG' },
    popup: { goal: '進球！', save: '撲救！', offside: '越位', foul: '犯規', clear: '解圍', corner: '角球', post: '中柱！', block: '封阻', buildout: '建構線！', tackle: '搶斷', intercept: '抄截', yellow: '黃牌', red: '紅牌' },
    kids: '兒童賽制', everyone: '輪流上場，每個人都能踢',
    ev: {
      goal: (p, e) => '⚽ ' + p + ' 進球！' + (e.type === 'penalty' ? '（十二碼）' : e.type === 'header' ? '（頭球）' : e.type === 'freekick' ? '（自由球直接破門）' : '') + (e.ast ? '（' + e.ast + ' 助攻）' : ''),
      save: (p, e) => e.by + ' 撲出 ' + p + ' 的射門！', blocked: p => p + ' 的射門被擋下', clear: (p, e) => e.by + ' 解圍，化解 ' + p + ' 的威脅',
      wide: p => p + ' 射門偏出', post: p => p + ' 的射門擊中門柱！', corner: () => '角球', out: p => p + ' 把球踢出界外',
      intercept: (p, e) => e.by + ' 抄截 ' + p + ' 的傳球', tackle: (p, e) => e.by + ' 從 ' + p + ' 腳下把球搶走',
      foul: (p, e) => p + ' 對 ' + e.on + ' 犯規', pen: p => '十二碼！' + p + ' 在禁區內被侵犯', yellow: p => '🟨 ' + p + ' 吃到黃牌', red: p => '🟥 ' + p + ' 被紅牌罰下！',
      offside: p => p + ' 越位', buildout: () => '守門員持球，對手退到建構線後', sub: (p, e) => '換人：' + e.innName + ' 上場，' + e.outName + ' 下場'
    }
  },
  en: {
    title: 'Pixel Soccer', subtitle: 'an automatic soccer sim driven by player ratings and tactics', speed: 'Speed', play: '▶ Kick off', pause: '⏸ Pause', resume: '▶ Resume',
    sim: '⏭ Sim to the end', next: 'Next match ▶', newTeams: '🔄 New teams', lang: '中文', fx: on => '✨ HD-2D FX: ' + (on ? 'on' : 'off'), format: 'Format',
    tabLog: 'Play-by-play', tabBox: 'Box score', tabRoster: 'Rosters', tabRules: 'Rules',
    period: (n, F) => F.periods === 4 ? 'Q' + n : (n === 1 ? '1st half' : '2nd half'), final: 'Full time', half: 'Half time',
    rec: (w, d, l) => w + '-' + d + '-' + l, onBall: 'On the ball', marking: 'Marking',
    rt: { pac: 'Pace', sho: 'Shoot', pas: 'Pass', dri: 'Dribble', def: 'Defend', phy: 'Physical', gk: 'Keeping', sta: 'Stamina' },
    today: 'Today', energy: 'Energy', total: 'Team', player: 'Player', pos: 'Pos', ovr: 'OVR',
    playbook: 'Playbook', playLabel: 'TACTIC', playRun: 'Tactic: ', pbWait: 'Once the match kicks off, every attack’s tactic is drawn here.',
    pbLegend: 'dashed = pass · solid = dribble · dotted = run off the ball · red = shot · gold = the shooter', formation: 'Formation', press: { high: 'High press', mid: 'Mid block', low: 'Low block' },
    stats: { POS: 'Possession', SH: 'Shots', SOT: 'On target', CK: 'Corners', FL: 'Fouls', OFF: 'Offsides', YC: 'Yellow', RC: 'Red', PA: 'Pass accuracy', XG: 'Expected goals' },
    popup: { goal: 'GOAL!', save: 'SAVE!', offside: 'OFFSIDE', foul: 'FOUL', clear: 'CLEARED', corner: 'CORNER', post: 'POST!', block: 'BLOCKED', buildout: 'BUILD-OUT!', tackle: 'TACKLE', intercept: 'INTERCEPTED', yellow: 'YELLOW', red: 'RED' },
    kids: 'Youth format', everyone: 'Rolling subs: everyone plays',
    ev: {
      goal: (p, e) => '⚽ GOAL! ' + p + (e.type === 'penalty' ? ' from the spot' : e.type === 'header' ? ' with a header' : e.type === 'freekick' ? ' straight from the free kick' : '') + (e.ast ? ' (assist ' + e.ast + ')' : ''),
      save: (p, e) => e.by + ' saves from ' + p + '!', blocked: p => p + '’s shot is blocked', clear: (p, e) => e.by + ' clears the danger from ' + p,
      wide: p => p + ' shoots wide', post: p => p + ' hits the post!', corner: () => 'Corner kick', out: p => p + ' puts it out of play',
      intercept: (p, e) => e.by + ' intercepts ' + p + '’s pass', tackle: (p, e) => e.by + ' wins the ball from ' + p,
      foul: (p, e) => 'Foul by ' + p + ' on ' + e.on, pen: p => 'PENALTY! ' + p + ' is brought down in the box', yellow: p => '🟨 Yellow card for ' + p, red: p => '🟥 ' + p + ' is sent off!',
      offside: p => p + ' is offside', buildout: () => 'Keeper’s ball: the opponents drop behind the build-out line', sub: (p, e) => 'Sub: ' + e.innName + ' on for ' + e.outName
    }
  }
};
const RULES = {
  zh: {
    '11v11': ['每隊 11 人上場（含守門員），名單 18 人，最多換 5 人', '球場約 105 × 68 公尺，球門 7.32 × 2.44 公尺', '上下半場各 45 分鐘＋傷停補時', '越位規則：全場適用', '可以頭球；黃牌、紅牌（兩黃變一紅）', '禁區內犯規判十二碼'],
    '9v9': ['每隊 9 人上場（含守門員）、適合 U11–U12', '球場約 73 × 46 公尺，球門 6.4 × 2.1 公尺', '上下半場各 30 分鐘', '建構線：守門員拿球或球門球時，對手要退到建構線後面，等球被傳出再上前', '越位規則：全場適用', '輪流換人，每個孩子都有上場時間'],
    '7v7': ['每隊 7 人上場（含守門員）、適合 U9–U10', '球場約 60 × 40 公尺，球門 5.5 × 1.8 公尺', '上下半場各 25 分鐘', '建構線：守門員拿球或球門球時，對手要退到建構線後', '越位只在建構線到底線之間判', '不能故意頭球（10 歲以下），頭球判間接自由球', '輪流換人，每個孩子都有上場時間'],
    '6v6': ['每隊 6 人上場（含守門員）、適合 U8–U9', '球場約 50 × 30 公尺，小球門 4.5 × 1.8 公尺', '四節各 12 分鐘', '沒有越位', '不能頭球', '輪流換人，每節都換'],
    '5v5': ['每隊 5 人上場（含守門員）、適合 U6–U8', '球場約 40 × 25 公尺，小球門 4 × 1.8 公尺', '四節各 10 分鐘', '沒有越位、不能頭球', '輪流換人，大家輪流踢、開心最重要']
  },
  en: {
    '11v11': ['11 players a side including the goalkeeper, 18 in the squad, up to 5 substitutions', 'Pitch about 105 × 68 m, goals 7.32 × 2.44 m', 'Two 45-minute halves plus stoppage time', 'Offside everywhere', 'Headers allowed; yellow and red cards (two yellows make a red)', 'A foul in the penalty box is a penalty kick'],
    '9v9': ['9 a side including the goalkeeper — for U11–U12', 'Pitch about 73 × 46 m, goals 6.4 × 2.1 m', 'Two 30-minute halves', 'Build-out line: on a goal kick or when the keeper has the ball, opponents must drop behind the build-out line until the ball is played', 'Offside everywhere', 'Rolling substitutions so every kid gets minutes'],
    '7v7': ['7 a side including the goalkeeper — for U9–U10', 'Pitch about 60 × 40 m, goals 5.5 × 1.8 m', 'Two 25-minute halves', 'Build-out line: on a goal kick or when the keeper has the ball, opponents drop behind the build-out line', 'Offside only between the build-out line and the goal line', 'No deliberate heading under 11 — an indirect free kick instead', 'Rolling substitutions so every kid gets minutes'],
    '6v6': ['6 a side including the goalkeeper — for U8–U9', 'Pitch about 50 × 30 m, small goals 4.5 × 1.8 m', 'Four 12-minute quarters', 'No offside', 'No heading', 'Rolling substitutions every quarter'],
    '5v5': ['5 a side including the goalkeeper — for U6–U8', 'Pitch about 40 × 25 m, small goals 4 × 1.8 m', 'Four 10-minute quarters', 'No offside, no heading', 'Rolling substitutions — everybody plays, fun comes first']
  }
};
let lang = 'zh';
try { const l = localStorage.getItem('soccer.lang'); if (l === 'en' || l === 'zh') lang = l; else if (!/^zh/i.test(navigator.language || 'zh')) lang = 'en'; } catch (e) { /* private mode */ }
const T = k => TX[lang][k];
const nm = p => (p.name[lang] || p.name.zh);
const tn = t => (t.city[lang] || t.city.zh) + (lang === 'en' ? ' ' : '') + (t.name[lang] || t.name.zh);
const star = p => p.star ? ' <span class="star">★</span>' : '';
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------------- teams (saved per format so records carry over) ----------------
let fmtKey = '11v11';
try { const f = localStorage.getItem('soccer.fmt'); if (FORMATS[f]) fmtKey = f; } catch (e) { /* ignore */ }
const KEYS = ['name', 'main', 'alt', 'trim', 'city', 'W', 'D', 'L', 'form', 'fmt', 'press'];
const PKEYS = ['id', 'name', 'num', 'pos', 'hgt', 'r', 's', 'star'];
function saveTeams() { try { localStorage.setItem('soccer.teams.' + fmtKey, JSON.stringify(teams.map(t => Object.assign(Object.fromEntries(KEYS.map(k => [k, t[k]])), { roster: t.roster.map(p => Object.fromEntries(PKEYS.map(k => [k, p[k]]))) })))); } catch (e) { /* ignore */ } }
function loadTeams() {
  try {
    const d = JSON.parse(localStorage.getItem('soccer.teams.' + fmtKey));
    if (!d || d.length !== 2) return null;
    return addStars(d.map(td => { const t = Object.assign({}, td); t.roster = td.roster.map(pd => Object.assign({}, pd, { team: t, g: newStats(), s: Object.assign(newStats(), pd.s) })); return t; }));
  } catch (e) { return null; }
}

let teams = null, game = null, cur = null, pt = 0, playing = false, speed = 8, logShown = 0;
let pos = {}, ball = { x: 52, y: 34, z: 0, holder: null }, popups = [], F = FORMATS[fmtKey];

// ---------------- the pitch: an HD-2D diorama, the camera high above the near touchline ----------------
const cv = $('court'), g = cv.getContext('2d');
const S = 4, PZ = 0.72, W = 320, H = 200;
let CAM = null, CC = 0, CS = 0, U = 1;                    // U: meters per "hoops foot" (the framing is the same for every pitch size)
function setCamera() {
  U = F.W / 50;
  CAM = { th: 50 * Math.PI / 180, h: 90 * U, back: 40 * U, foc: 290, cx: 160, cy: 100 };
  CC = Math.cos(CAM.th); CS = Math.sin(CAM.th);
}
function P(x, y, z) {                     // pitch meters (x along, y 0 far touchline – W near, z up) → logical px; s = px per meter
  const rF = F.W - y + CAM.back, rZ = (z || 0) - CAM.h, d = rF * CC - rZ * CS, up = rF * CS + rZ * CC;
  return { x: CAM.cx + CAM.foc * (x - F.L / 2) / d, y: CAM.cy - CAM.foc * up / d, s: CAM.foc / d };
}
function floorY(Y) { const q = (CAM.cy - Y) / CAM.foc; return F.W + CAM.back + CAM.h * (CC + q * CS) / (q * CC - CS); }
g.imageSmoothingEnabled = false;
const canFilter = typeof g.filter === 'string';
let fxOn = canFilter;
try { if (localStorage.getItem('soccer.fx') === 'off') fxOn = false; } catch (e) { /* ignore */ }
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + c.map(v => ('0' + v.toString(16)).slice(-2)).join('');
}
function poly(a, pts, col) { a.fillStyle = col; a.beginPath(); pts.forEach((q, i) => i ? a.lineTo(q.x, q.y) : a.moveTo(q.x, q.y)); a.closePath(); a.fill(); }
function seg(a, b, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }

// the grass and the markings, painted flat in meters, then laid into perspective row by row
let TEX, TX0, TY0, TXW, TYH;
function pitchTexture() {
  TX0 = -0.2 * F.L; TY0 = -0.2 * F.W; TXW = F.L * 1.4; TYH = F.W * 1.5; TEX = Math.max(6, 900 / F.W);
  const c = document.createElement('canvas'); c.width = Math.round(TXW * TEX); c.height = Math.round(TYH * TEX);
  const f = c.getContext('2d'), r = rng(31), park = F.venue !== 'stadium';
  f.setTransform(TEX, 0, 0, TEX, -TX0 * TEX, -TY0 * TEX);
  f.fillStyle = park ? '#4f9a3c' : '#3f8f3a'; f.fillRect(TX0, TY0, TXW, TYH);
  const stripes = F.n >= 9 ? 14 : 10, sw = F.L / stripes;                     // mowing stripes
  for (let i = -3; i < stripes + 3; i++) { f.fillStyle = i % 2 ? (park ? '#57a443' : '#47993f') : (park ? '#4a9238' : '#3c8836'); f.fillRect(i * sw, TY0, sw, TYH); }
  for (let i = 0; i < 4000; i++) { f.fillStyle = r() < 0.5 ? 'rgba(20,60,10,0.18)' : 'rgba(180,230,120,0.14)'; f.fillRect(TX0 + r() * TXW, TY0 + r() * TYH, 0.12 + r() * 0.25, 0.06); }
  if (park) {                                                                   // worn patches in the goalmouths and the middle
    [[0.03, 0.5], [0.97, 0.5], [0.5, 0.5]].forEach(([a, b]) => { f.fillStyle = 'rgba(150,120,70,0.35)'; f.beginPath(); f.ellipse(a * F.L, b * F.W, F.L * 0.04, F.W * 0.12, 0, 0, Math.PI * 2); f.fill(); });
  }
  const lw = Math.max(0.12, F.W / 450);
  f.strokeStyle = '#f4f8f2'; f.lineWidth = lw;
  const line = (x1, y1, x2, y2) => { f.beginPath(); f.moveTo(x1, y1); f.lineTo(x2, y2); f.stroke(); };
  f.strokeRect(0, 0, F.L, F.W); line(F.L / 2, 0, F.L / 2, F.W);
  const circle = F.n >= 11 ? 9.15 : F.n >= 9 ? 7.3 : F.n >= 7 ? 5.5 : 4.5;
  f.beginPath(); f.arc(F.L / 2, F.W / 2, circle, 0, Math.PI * 2); f.stroke();
  f.fillStyle = '#f4f8f2'; f.beginPath(); f.arc(F.L / 2, F.W / 2, lw * 1.6, 0, Math.PI * 2); f.fill();
  [0, 1].forEach(side => {
    const gx = side ? F.L : 0, dir = side ? -1 : 1;
    f.strokeRect(Math.min(gx, gx + dir * F.box[0]), F.W / 2 - F.box[1] / 2, F.box[0], F.box[1]);
    f.strokeRect(Math.min(gx, gx + dir * F.six[0]), F.W / 2 - F.six[1] / 2, F.six[0], F.six[1]);
    f.beginPath(); f.arc(gx + dir * F.spot, F.W / 2, lw * 1.6, 0, Math.PI * 2); f.fill();
    if (F.n >= 9) { const a = Math.acos(clamp((F.box[0] - F.spot) / circle, -1, 1)); f.beginPath(); if (side) f.arc(gx + dir * F.spot, F.W / 2, circle, Math.PI - a, Math.PI + a); else f.arc(gx + dir * F.spot, F.W / 2, circle, -a, a); f.stroke(); }
    [0, F.W].forEach(cy => { f.beginPath(); f.arc(gx, cy, Math.max(0.8, F.W / 70), cy ? (side ? Math.PI : -Math.PI / 2) : (side ? Math.PI / 2 : 0), cy ? (side ? Math.PI * 1.5 : 0) : (side ? Math.PI : Math.PI / 2)); f.stroke(); });
    if (F.buildOut) {                                                           // the build-out lines (dashed)
      f.save(); f.setLineDash([F.W / 40, F.W / 50]); f.strokeStyle = 'rgba(255,240,160,0.95)';
      line(gx + dir * F.buildOut, 0, gx + dir * F.buildOut, F.W); f.restore();
    }
  });
  return c;
}
function projectFloor() {
  const tex = pitchTexture(), c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const a = c.getContext('2d'); a.imageSmoothingEnabled = true;
  for (let row = Math.max(0, Math.floor(P(F.L / 2, TY0, 0).y * S)); row < H * S; row++) {
    const y0 = floorY(row / S), y1 = floorY((row + 1) / S), ym = (y0 + y1) / 2;
    if (y0 > TY0 + TYH) break;
    const l = P(TX0, ym, 0), r = P(TX0 + TXW, ym, 0);
    a.drawImage(tex, 0, Math.max(0, (y0 - TY0) * TEX), tex.width, Math.max(0.5, (y1 - y0) * TEX), l.x * S, row, (r.x - l.x) * S, 1);
  }
  if (F.venue === 'stadium') {                                                  // floodlight pools
    a.globalCompositeOperation = 'source-atop';
    [[0.25, 0.5], [0.75, 0.5]].forEach(([u, v]) => {
      const q = P(u * F.L, v * F.W, 0), rx = F.L * 0.5 * q.s * S;
      a.save(); a.translate(q.x * S, q.y * S); a.scale(1, 0.55);
      const gr = a.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(255,255,230,0.16)'); gr.addColorStop(1, 'rgba(255,255,230,0)');
      a.fillStyle = gr; a.fillRect(-rx, -rx, rx * 2, rx * 2); a.restore();
    });
  }
  return c;
}

// ---- the venue: a night stadium (11v11), a school field with bleachers (9v9), a park with parents and tents (7v7 and smaller) ----
const SKINS = ['#f6d3b3', '#eab68c', '#cf9566', '#a06842', '#6f4529'];
const HAIRS = ['#1b1410', '#3a2414', '#6a3e1e', '#c8962e', '#a4381c', '#e8e2d8'];
const FAN = ['#e8e8e8', '#30343c', '#c03a3a', '#3a6ac0', '#e0b030', '#5a9a4a', '#8a4ac0', '#f08aa0'];
function fan(a, x, y, z, r, cheer, home, away, sit) {
  const v = [r(), r(), r(), r(), r(), r(), r(), r()];
  const b = P(x, y, z), s = b.s * U;
  if (v[0] < 0.08 && !sit) { a.fillStyle = '#2c2446'; a.fillRect(b.x - 0.7 * s, b.y - 1.4 * s, 1.4 * s, 1.4 * s); return; }
  const shirt = v[1] < 0.42 ? home.main : v[1] < 0.62 ? away.main : v[1] < 0.7 ? home.alt : FAN[Math.floor(v[2] * FAN.length)];
  const skin = SKINS[Math.floor(v[3] * SKINS.length)], hair = HAIRS[Math.floor(v[4] * 5)];
  const up = cheer && v[5] < 0.8 ? (0.3 + v[6] * 0.5) * s : 0, arms = cheer && v[7] < 0.75;
  const tw = 1.5 * s, th = (sit ? 1.6 : 2.6) * s, hr = 0.58 * s, by = b.y - up;
  if (sit) { a.fillStyle = '#3a5a8a'; a.fillRect(b.x - tw * 0.7, b.y - 1.1 * s, tw * 1.4, 1.1 * s); a.fillStyle = '#2a2a30'; a.fillRect(b.x - tw * 0.7, b.y - 1.1 * s, 0.2 * s, 1.1 * s); a.fillRect(b.x + tw * 0.6, b.y - 1.1 * s, 0.2 * s, 1.1 * s); }
  a.fillStyle = shirt; a.fillRect(b.x - tw / 2, by - th, tw, th * (sit ? 0.75 : 0.62));
  if (!sit) { a.fillStyle = '#3a4058'; a.fillRect(b.x - tw / 2, by - th * 0.38, tw * 0.42, th * 0.38); a.fillRect(b.x + tw * 0.08, by - th * 0.38, tw * 0.42, th * 0.38); }
  if (arms) { a.fillStyle = skin; a.fillRect(b.x - tw / 2 - 0.3 * s, by - th - 1.2 * s, 0.4 * s, 1.4 * s); a.fillRect(b.x + tw / 2 - 0.1 * s, by - th - 1.2 * s, 0.4 * s, 1.4 * s); }
  a.fillStyle = skin; a.beginPath(); a.arc(b.x, by - th - hr * 0.8, hr, 0, Math.PI * 2); a.fill();
  a.fillStyle = hair; a.fillRect(b.x - hr, by - th - hr * 1.8, hr * 2, hr * 0.75);
}
function tree(a, x, y, k, r) {
  const b = P(x, y, 0), s = b.s * U * k, h = 9 * s;
  a.fillStyle = '#5a3a20'; a.fillRect(b.x - 0.6 * s, b.y - h * 0.55, 1.2 * s, h * 0.55);
  [[0, -h * 0.75, 3.6], [-2.2, -h * 0.6, 2.8], [2.2, -h * 0.6, 2.8], [0, -h * 0.98, 2.6]].forEach(([dx, dy, rad], i) => {
    a.fillStyle = ['#2f7a34', '#3a8a3e', '#286c2e', '#46984a'][i]; a.beginPath(); a.arc(b.x + dx * s, b.y + dy, rad * s, 0, Math.PI * 2); a.fill();
  });
}
function tent(a, x, y, col) {
  const s = P(x, y, 0).s * U, q = P(x, y, 0), w = 6 * s, h = 5 * s;
  a.fillStyle = '#d8d8d8'; a.fillRect(q.x - w / 2, q.y - h, 0.3 * s, h); a.fillRect(q.x + w / 2 - 0.3 * s, q.y - h, 0.3 * s, h);
  a.fillStyle = col; a.beginPath(); a.moveTo(q.x - w / 2 - s, q.y - h); a.lineTo(q.x, q.y - h - 2 * s); a.lineTo(q.x + w / 2 + s, q.y - h); a.closePath(); a.fill();
  a.fillStyle = shade(col, -0.3); a.fillRect(q.x - w / 2 - s, q.y - h, w + 2 * s, 0.8 * s);
}
let floorProj = null, arenaImgs = null, cheerUntil = 0;
function buildArena(cheer) {
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const a = c.getContext('2d'), home = teams[1], away = teams[0], r = rng(77), night = F.venue === 'stadium';
  const bg = a.createLinearGradient(0, 0, 0, H * S);
  if (night) { bg.addColorStop(0, '#060818'); bg.addColorStop(0.45, '#1a1840'); bg.addColorStop(1, '#0c0a16'); }
  else { bg.addColorStop(0, '#5aa8ec'); bg.addColorStop(0.42, '#bfe2ff'); bg.addColorStop(1, '#9ccf88'); }
  a.fillStyle = bg; a.fillRect(0, 0, W * S, H * S);
  a.setTransform(S, 0, 0, S, 0, 0);
  const quad = (pts, col) => poly(a, pts, col), x0 = -0.17 * F.L, x1 = 1.17 * F.L;
  if (night) {
    for (let i = 14; i >= 0; i--) {                                             // big stands along the far touchline
      const yr = -(9 + i * 2.4) * U, zr = (1.2 + i * 1.7) * U;
      quad([P(x0, yr + 1.2 * U, zr - 1.7 * U), P(x1, yr + 1.2 * U, zr - 1.7 * U), P(x1, yr + 1.2 * U, zr), P(x0, yr + 1.2 * U, zr)], '#120e1e');
      quad([P(x0, yr + 1.2 * U, zr), P(x1, yr + 1.2 * U, zr), P(x1, yr - 1.2 * U, zr), P(x0, yr - 1.2 * U, zr)], i % 2 ? '#241c3a' : '#1e1832');
      for (let x = x0 + U; x < x1; x += 2.1 * U) fan(a, x + (r() - 0.5) * 0.5 * U, yr, zr, r, cheer, home, away);
    }
    [-1, 1].forEach(sd => {                                                     // and behind both goals
      for (let j = 10; j >= 0; j--) {
        const xr = sd < 0 ? -(14 + j * 2.4) * U : F.L + (14 + j * 2.4) * U, zr = (1.2 + j * 1.7) * U, xf = xr - sd * 1.2 * U, xb = xr + sd * 1.2 * U, ya = -9 * U, yb = F.W + 12 * U;
        quad([P(xf, ya, zr - 1.7 * U), P(xf, yb, zr - 1.7 * U), P(xf, yb, zr), P(xf, ya, zr)], '#120e1e');
        quad([P(xf, ya, zr), P(xf, yb, zr), P(xb, yb, zr), P(xb, ya, zr)], j % 2 ? '#241c3a' : '#1e1832');
        for (let y = ya + U; y < yb; y += 2.1 * U) fan(a, xr, y + (r() - 0.5) * 0.5 * U, zr, r, cheer, home, away);
      }
    });
    a.fillStyle = 'rgba(10,8,25,0.32)'; a.fillRect(0, 0, W, H);
  } else {
    // a school building or hills far away, then trees, then the families along the far touchline
    a.fillStyle = '#7ab0c8'; a.beginPath(); a.moveTo(0, 62); for (let x = 0; x <= W; x += 8) a.lineTo(x, 58 - Math.sin(x / 37) * 7 - Math.sin(x / 13) * 2); a.lineTo(W, 80); a.lineTo(0, 80); a.fill();
    if (F.venue === 'school') { const b = P(F.L * 0.3, -26 * U, 0), e = P(F.L * 0.75, -26 * U, 0), hh = 7 * b.s * U; a.fillStyle = '#c8a07a'; a.fillRect(b.x, b.y - hh, e.x - b.x, hh); a.fillStyle = '#8a4a3a'; a.fillRect(b.x - 2, b.y - hh - 2, e.x - b.x + 4, 2.5); for (let x = b.x + 3; x < e.x - 3; x += 6) { a.fillStyle = '#5a7aa8'; a.fillRect(x, b.y - hh * 0.75, 3, hh * 0.3); } }
    for (let i = 0; i < 26; i++) tree(a, x0 + (x1 - x0) * (i + r() * 0.5) / 26, -(15 + r() * 8) * U, 0.9 + r() * 0.5, r);
    [-1, 1].forEach(sd => { for (let i = 0; i < 6; i++) tree(a, sd < 0 ? -(10 + r() * 6) * U : F.L + (10 + r() * 6) * U, (i / 5) * F.W * 1.1 - 6 * U, 0.9 + r() * 0.4, r); });
    if (F.venue === 'school') {                                                  // aluminium bleachers
      for (let i = 4; i >= 0; i--) {
        const yr = -(8 + i * 1.6) * U, zr = (0.6 + i * 0.9) * U, bx0 = F.L * 0.2, bx1 = F.L * 0.8;
        quad([P(bx0, yr + 0.8 * U, zr - 0.9 * U), P(bx1, yr + 0.8 * U, zr - 0.9 * U), P(bx1, yr + 0.8 * U, zr), P(bx0, yr + 0.8 * U, zr)], '#8a929e');
        quad([P(bx0, yr + 0.8 * U, zr), P(bx1, yr + 0.8 * U, zr), P(bx1, yr - 0.8 * U, zr), P(bx0, yr - 0.8 * U, zr)], i % 2 ? '#c8d0da' : '#b4bcc8');
        for (let x = bx0 + U; x < bx1; x += 2.4 * U) if (r() < 0.7) fan(a, x, yr, zr, r, cheer, home, away);
      }
    } else {
      [0.18, 0.36, 0.64, 0.82].forEach((u, i) => tent(a, F.L * u, -9 * U, [home.main, away.main, home.alt, away.main][i]));
      for (let x = F.L * 0.08; x < F.L * 0.92; x += 2.2 * U) if (r() < 0.75) fan(a, x + (r() - 0.5) * U, -(5 + r() * 3) * U, 0, r, cheer, home, away, r() < 0.6);
    }
  }
  a.drawImage(floorProj, 0, 0, W, H);
  if (night) {                                                                   // LED boards and floodlights
    const lb = P(-0.1 * F.L, -6 * U, 0), lt = P(1.1 * F.L, -6 * U, 2 * U), lh = lb.y - lt.y;
    a.fillStyle = '#06060c'; a.fillRect(lb.x, lt.y, lt.x - lb.x, lh);
    a.save(); a.beginPath(); a.rect(lb.x, lt.y + 0.3, lt.x - lb.x, lh - 0.6); a.clip();
    a.font = 'bold ' + (lh * 0.62) + 'px sans-serif'; a.textBaseline = 'middle'; a.textAlign = 'left';
    const words = ['PIXEL SOCCER', '★', tn(home), '⚽', 'FAIR PLAY', '★', tn(away), '⚽'];
    for (let x = lb.x + 1, k = 0; x < lt.x; k++) { const w = words[k % words.length]; a.fillStyle = k % 4 === 2 ? shade(home.main, 0.35) : k % 4 === 0 ? '#ffd23a' : k % 4 === 3 ? shade(away.main, 0.35) : '#ffffff'; a.fillText(w, x, lt.y + lh / 2); x += a.measureText(w).width + lh * 0.8; }
    a.restore();
    a.globalCompositeOperation = 'lighter';
    [20, 300].forEach(x => { [[-1, 0]].forEach(() => {
      const gr = a.createRadialGradient(x, 6, 0, x, 6, 14); gr.addColorStop(0, 'rgba(255,255,240,0.95)'); gr.addColorStop(1, 'rgba(255,255,240,0)'); a.fillStyle = gr; a.fillRect(x - 14, -8, 28, 28);
      const gb = a.createLinearGradient(0, 6, 0, 150); gb.addColorStop(0, 'rgba(255,255,230,0.12)'); gb.addColorStop(1, 'rgba(255,255,230,0)'); a.fillStyle = gb;
      a.beginPath(); a.moveTo(x - 3, 6); a.lineTo(x + 3, 6); a.lineTo(160 + (x - 160) * 0.2 + 60, 150); a.lineTo(160 + (x - 160) * 0.2 - 60, 150); a.closePath(); a.fill(); }); });
    a.globalCompositeOperation = 'source-over';
  }
  // the benches (dugouts) on the far touchline
  [0, 1].forEach(sd => {
    const xs = sd ? F.L * 0.56 : F.L * 0.3, xe = xs + F.L * 0.14, yb = -3.4 * U;
    quad([P(xs, yb, 0), P(xe, yb, 0), P(xe, yb, 2.6 * U), P(xs, yb, 2.6 * U)], night ? shade(teams[sd].main, -0.45) : 'rgba(255,255,255,0)');
    quad([P(xs, yb + 0.2 * U, 0.9 * U), P(xe, yb + 0.2 * U, 0.9 * U), P(xe, yb + 1.2 * U, 0.9 * U), P(xs, yb + 1.2 * U, 0.9 * U)], teams[sd].main);
  });
  return c;
}

// ---- post-processing for the HD-2D look (same as Pixel Hoops) ----
const bufs = {};
function buf(name, w, h) { const b = bufs[name] || (bufs[name] = document.createElement('canvas')); if (b.width !== w || b.height !== h) { b.width = w; b.height = h; b.dirty = true; } return b; }
function tiltShift() {
  const w = cv.width, h = cv.height, sm = buf('dof', w / 4, h / 4), sg = sm.getContext('2d');
  sg.filter = 'blur(1.6px)'; sg.clearRect(0, 0, sm.width, sm.height); sg.drawImage(cv, 0, 0, sm.width, sm.height); sg.filter = 'none';
  const m = buf('dofmask', w, h);
  if (m.dirty) { const mg = m.getContext('2d'), gr = mg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.2, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.9, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)'); mg.fillStyle = gr; mg.fillRect(0, 0, w, h); m.dirty = false; }
  const big = buf('dofbig', w, h), bg = big.getContext('2d');
  bg.globalCompositeOperation = 'source-over'; bg.clearRect(0, 0, w, h); bg.imageSmoothingEnabled = true; bg.drawImage(sm, 0, 0, w, h);
  bg.globalCompositeOperation = 'destination-in'; bg.drawImage(m, 0, 0); bg.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(big, 0, 0); g.restore();
}
function glow() {
  const w = cv.width, h = cv.height, b = buf('bloom', w / 4, h / 4), bl = b.getContext('2d'), night = F.venue === 'stadium';
  bl.filter = 'brightness(0.7) contrast(3) saturate(1.4) blur(3px)'; bl.clearRect(0, 0, b.width, b.height); bl.drawImage(cv, 0, 0, b.width, b.height); bl.filter = 'none';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
  g.globalCompositeOperation = 'screen'; g.globalAlpha = night ? 0.34 : 0.18; g.drawImage(b, 0, 0, w, h);
  g.globalAlpha = 1; g.globalCompositeOperation = 'soft-light'; g.fillStyle = night ? 'rgba(120,150,255,0.12)' : 'rgba(255,200,120,0.12)'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  const v = buf('vig', w, h);
  if (v.dirty) { const vg = v.getContext('2d'), gr = vg.createRadialGradient(w / 2, h * 0.58, h * 0.35, w / 2, h * 0.58, w * 0.7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(6,4,18,0.5)'); vg.fillStyle = gr; vg.fillRect(0, 0, w, h); v.dirty = false; }
  g.drawImage(v, 0, 0); g.restore();
}

// ---------------- players: big-headed pixel sprites in soccer kits ----------------
const STYLES = ['short', 'buzz', 'afro', 'spiky', 'bun', 'mohawk', 'bald', 'long', 'rows'];
const BOOTS = ['#f4f4f4', '#202020', '#e03030', '#2f6fde', '#30c060', '#f0a020', '#ff7ab8'];
const STAR_LOOK = {
  'Josh Chen': { skin: 1, hair: 1, style: 'short', band: '#2e9e44' }, 'Jasper Chen': { skin: 1, hair: 0, style: 'spiky', band: null },
  'Jeff Chen': { skin: 1, hair: 0, style: 'short', beard: true, goggles: true, band: null }, 'Erin Lai': { skin: 0, hair: 1, style: 'bun', band: '#ff7aa0', beard: false }
};
function look(p) {
  if (p.look) return p.look;
  let seed = (p.id * 2654435761) % 2147483647 || 7;
  const r = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const kid = F.n < 11;
  const L = { skin: Math.floor(r() * SKINS.length), hair: r() < 0.92 ? Math.floor(r() * 5) : 5, style: STYLES[Math.floor(r() * STYLES.length)], beard: !kid && r() < 0.2, band: r() < 0.2 ? 'team' : null, goggles: r() < 0.05, boots: BOOTS[Math.floor(r() * BOOTS.length)] };
  if (p.star) Object.assign(L, { beard: false, goggles: false }, STAR_LOOK[p.name.en] || {}, { boots: '#ffd23a' });
  if (kid && p.star && p.name.en === 'Jeff Chen') L.beard = true;
  return (p.look = L);
}
const DIGITS = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'] };
const GK_KITS = ['#c6f02a', '#ff8a1a', '#9a5ae0', '#2ad0c0', '#f0f0f0'];
function kitOf(p, team) {
  if (p.pos !== 'GK') return { shirt: team.main, shorts: team.alt, socks: team.main, trim: team.trim, num: team.alt };
  const k = GK_KITS.find(c => c !== team.main && c !== teams[1 - teams.indexOf(team)].main) || '#c6f02a';
  return { shirt: k, shorts: '#202028', socks: k, trim: '#202028', num: '#202028', gloves: true };
}
const spriteCache = {};
function sprite(p, team, frame) {
  const kit = kitOf(p, team), key = p.id + '|' + kit.shirt + '|' + frame;
  if (spriteCache[key]) return spriteCache[key];
  const L = look(p), skin = SKINS[L.skin], skinD = shade(skin, -0.18), hair = HAIRS[L.hair], hairD = shade(hair, -0.35);
  const Wd = 22, hx = 5, hy = 5, ty = hy + 12, sy = ty + 8, ly = sy + 4, legH = 5, Ht = ly + legH + 3;
  const c = document.createElement('canvas'); c.width = Wd; c.height = Ht;
  const x = c.getContext('2d'), R = (a, b, w, h, col) => { if (!col) return; x.fillStyle = col; x.fillRect(a, b, w, h); };
  const band = L.band === 'team' ? team.alt : L.band, step = frame % 2;
  if (L.style === 'afro') { x.fillStyle = hair; x.beginPath(); x.ellipse(hx + 6, hy + 3, 8.5, 6.5, 0, 0, Math.PI * 2); x.fill(); }
  if (L.style === 'long') { R(hx - 1, hy + 2, 3, 10, hairD); R(hx + 10, hy + 2, 3, 10, hairD); }
  if (L.style === 'bun') { x.fillStyle = hair; x.beginPath(); x.arc(hx + 6, hy - 2, 2.6, 0, Math.PI * 2); x.fill(); R(hx + 4, hy - 1, 4, 1, band || hairD); }
  R(3, ty + 1, 3, 4, kit.shirt); R(16, ty + 1, 3, 4, kit.shirt);                                     // sleeves
  R(3, ty + 5, 3, 3, skin); R(16, ty + 5, 3, 3, skinD);
  R(3, ty + 7 + (step ? 0 : 1), 3, 2, kit.gloves ? '#f4f4f4' : skin); R(16, ty + 7 + (step ? 1 : 0), 3, 2, kit.gloves ? '#f4f4f4' : skinD);
  R(5, ty, 12, 8, kit.shirt); R(5, ty, 12, 1, kit.trim); R(10, ty, 2, 2, kit.trim);                  // shirt with collar
  const num = String(p.num), dw = num.length * 4 - 1, dx = 11 - Math.floor(dw / 2);
  num.split('').forEach((d, i) => DIGITS[d].forEach((row, yy) => row.split('').forEach((b, xx) => { if (b === '1') R(dx + i * 4 + xx, ty + 2 + yy, 1, 1, kit.num); })));
  R(5, sy, 12, 4, kit.shorts); R(5, sy, 12, 1, shade(kit.shorts, -0.25)); x.clearRect(10, sy + 3, 2, 1);
  const l1 = step ? 1 : 0, l2 = step ? 0 : 1;                                                         // knees, socks, boots
  R(6, ly, 3, 1, skin); R(13, ly, 3, 1, skinD);
  R(6, ly + 1, 3, legH - 1 - l1, kit.socks); R(13, ly + 1, 3, legH - 1 - l2, kit.socks);
  R(6, ly + 1, 3, 1, shade(kit.socks, 0.4)); R(13, ly + 1, 3, 1, shade(kit.socks, 0.4));
  R(5, ly + legH - l1, 5, 2, L.boots); R(12, ly + legH - l2, 5, 2, L.boots);
  R(5, ly + legH - l1 + 1, 5, 1, shade(L.boots, -0.4)); R(12, ly + legH - l2 + 1, 5, 1, shade(L.boots, -0.4));
  R(hx, hy + 1, 12, 9, skin); R(hx + 1, hy, 10, 11, skin);                                             // the big head
  R(hx - 1, hy + 5, 1, 2, skin); R(hx + 12, hy + 5, 1, 2, skinD); R(hx + 1, hy + 10, 10, 1, skinD);
  if (L.style === 'short' || L.style === 'spiky' || L.style === 'bun' || L.style === 'long') { R(hx, hy, 12, 3, hair); R(hx + 1, hy - 1, 10, 1, hair); R(hx, hy + 3, 1, 2, hair); R(hx + 11, hy + 3, 1, 2, hair); R(hx + 2, hy, 3, 1, shade(hair, 0.25)); }
  if (L.style === 'spiky') for (let k = 0; k < 4; k++) { R(hx + 1 + k * 3, hy - 2, 2, 1, hair); R(hx + 2 + k * 3, hy - 3, 1, 1, hair); }
  if (L.style === 'buzz') { R(hx + 1, hy, 10, 2, hairD); R(hx, hy + 1, 12, 1, hairD); }
  if (L.style === 'rows') { R(hx, hy, 12, 3, hair); for (let k = 1; k < 12; k += 2) R(hx + k, hy, 1, 3, hairD); }
  if (L.style === 'mohawk') { R(hx + 4, hy - 3, 4, 6, hair); R(hx + 5, hy - 3, 1, 5, shade(hair, 0.3)); }
  if (L.style === 'afro') R(hx + 1, hy + 3, 10, 1, hair);
  if (L.style === 'bald') R(hx + 3, hy + 1, 2, 1, shade(skin, 0.45));
  if (band) { R(hx, hy + 3, 12, 1, band); R(hx + 11, hy + 3, 2, 2, band); }
  R(hx + 2, hy + 4, 3, 1, hairD); R(hx + 7, hy + 4, 3, 1, hairD);
  if (L.goggles) { R(hx + 1, hy + 4, 10, 4, '#2a2a34'); R(hx + 2, hy + 5, 3, 2, '#9ad8ff'); R(hx + 7, hy + 5, 3, 2, '#9ad8ff'); }
  R(hx + 3, hy + 5, 2, 2, '#1a1420'); R(hx + 7, hy + 5, 2, 2, '#1a1420'); R(hx + 3, hy + 5, 1, 1, '#ffffff'); R(hx + 7, hy + 5, 1, 1, '#ffffff');
  R(hx + 1, hy + 7, 2, 1, 'rgba(255,110,120,0.45)'); R(hx + 9, hy + 7, 2, 1, 'rgba(255,110,120,0.45)');
  if (L.beard) { R(hx, hy + 6, 1, 4, hair); R(hx + 11, hy + 6, 1, 4, hair); R(hx + 1, hy + 8, 10, 3, hair); R(hx + 4, hy + 8, 4, 1, skin); }
  R(hx + 5, hy + 8, 2, 1, L.beard ? '#e8a0a0' : '#8a3a3a');
  const id = x.getImageData(0, 0, Wd, Ht), d = id.data, src = new Uint8ClampedArray(d);
  for (let yy = 0; yy < Ht; yy++) for (let xx = 0; xx < Wd; xx++) {
    const i = (yy * Wd + xx) * 4; if (src[i + 3] > 40) continue;
    if ((xx > 0 && src[i - 1] > 40) || (xx < Wd - 1 && src[i + 7] > 40) || (yy > 0 && src[i - Wd * 4 + 3] > 40) || (yy < Ht - 1 && src[i + Wd * 4 + 3] > 40)) { d[i] = 20; d[i + 1] = 16; d[i + 2] = 24; d[i + 3] = 255; }
  }
  x.putImageData(id, 0, 0);
  return (spriteCache[key] = c);
}
const overlays = [];
function drawPlayer(p, team, at, hasBall) {
  const step = at.moving ? Math.floor(performance.now() / 110) % 2 + 1 : 0;
  const img = sprite(p, team, step), w = img.width * PZ, h = img.height * PZ, k = PZ * 2;
  const f = P(at.x, at.y, 0), fx = Math.round(f.x * S) / S, fy = Math.round(f.y * S) / S;
  g.fillStyle = p.star ? 'rgba(255,210,60,0.55)' : 'rgba(0,0,0,0.32)';
  g.beginPath(); g.ellipse(fx, fy + 0.3, (p.star ? 5.5 : 4.5) * k, 1.8 * k, 0, 0, Math.PI * 2); g.fill();
  if (at.dive) { g.save(); g.translate(fx, fy - h * 0.35); g.rotate(at.dive); g.drawImage(img, -w / 2, -h * 0.65, w, h); g.restore(); }
  else g.drawImage(img, fx - w / 2, fy - h + 1, w, h);
  const head = fy - h + 1;
  if (p.star) { g.fillStyle = '#ffd23a'; g.fillRect(fx - 0.5 * k, head - 3 * k, k, k); g.fillRect(fx - 1.5 * k, head - 2 * k, 3 * k, k); g.fillRect(fx - 0.5 * k, head - k, k, k); }
  if (hasBall) overlays.push(() => {
    g.fillStyle = '#ffe14a'; g.beginPath(); g.moveTo(fx - 2 * k, head - 6 * k); g.lineTo(fx + 2 * k, head - 6 * k); g.lineTo(fx, head - 3.5 * k); g.fill();
    const label = lang === 'en' ? p.name.en.split(' ').pop() : p.name.zh;
    g.font = `bold ${4 * k}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom';
    const tw = g.measureText(label).width + 3 * k;
    g.fillStyle = 'rgba(10,10,20,0.75)'; g.fillRect(fx - tw / 2, head - 11 * k, tw, 5 * k);
    g.fillStyle = p.star ? '#ffd23a' : '#ffffff'; g.fillText(label, fx, head - 6.4 * k);
  });
}
function drawBenches() {
  [0, 1].forEach(sd => {
    const T2 = game.ts[sd], on = new Set(T2.on.map(p => p.id)), xs = sd ? F.L * 0.56 : F.L * 0.3;
    teams[sd].roster.filter(p => !on.has(p.id)).slice(0, 8).forEach((p, i) => {
      const img = sprite(p, teams[sd], 0), q = P(xs + (i + 0.5) * F.L * 0.14 / 8, -2.6 * U, 0.9 * U), w = img.width * PZ, hh = 28 * PZ;
      g.drawImage(img, 0, 0, img.width, 28, Math.round((q.x - w / 2) * S) / S, Math.round((q.y - hh) * S) / S, w, hh);
    });
  });
}
// the goals: posts, crossbar and net; the far half draws before the players, the near post after
function goal(side, front) {
  const gx = side ? F.L : 0, dir = side ? 1 : -1, y0 = F.W / 2 - F.goalW / 2, y1 = F.W / 2 + F.goalW / 2, Hh = F.goalH, D = Math.max(1, F.goalW * 0.22), Wp = Math.max(0.6, F.W / 120);
  if (!front) {
    g.strokeStyle = 'rgba(235,240,245,0.55)'; g.lineWidth = 0.3; g.beginPath();
    for (let i = 0; i <= 8; i++) { const y = lerp(y0, y1, i / 8), a = P(gx, y, Hh), b = P(gx + dir * D, y, Hh * 0.7), c2 = P(gx + dir * D, y, 0); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c2.x, c2.y); }
    for (let j = 0; j <= 4; j++) { const z = Hh * 0.7 * j / 4, a = P(gx + dir * D, y0, z), b = P(gx + dir * D, y1, z); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    [y0, y1].forEach(y => { const a = P(gx, y, Hh), b = P(gx + dir * D, y, Hh * 0.7), c2 = P(gx + dir * D, y, 0), d = P(gx, y, 0); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c2.x, c2.y); g.lineTo(d.x, d.y); });
    g.stroke();
    seg(P(gx, y0, 0), P(gx, y0, Hh), '#ffffff', Wp); seg(P(gx, y0, Hh), P(gx, y1, Hh), '#ffffff', Wp);
  } else seg(P(gx, y1, 0), P(gx, y1, Hh), '#ffffff', Wp * 1.1);
}
function flag(x, y) { const b = P(x, y, 0), t = P(x, y, 1.6 * U); seg(b, t, '#f4f4f4', 0.4); g.fillStyle = (x < 1 ? teams[0] : teams[1]).main; g.fillRect(t.x, t.y, 2.2, 1.6); }
function drawBall() {
  const sh = P(ball.x, ball.y, 0), b = P(ball.x, ball.y, ball.z), r = Math.max(1.6, 0.42 * U * b.s);
  g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(sh.x, sh.y, r * 1.1, r * 0.42, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1a1a22'; g.lineWidth = 0.35; g.stroke();
  g.fillStyle = '#1a1a22'; const sp = performance.now() / 120; g.fillRect(b.x - r * 0.35 + Math.sin(sp) * r * 0.3, b.y - r * 0.35, r * 0.6, r * 0.6);
}
function scoreBoard() {                    // a hanging screen at the stadium, a little flip board at the park
  const home = teams[1], away = teams[0], sc = liveScore(), night = F.venue === 'stadium';
  const x0 = 124, y0 = night ? 4 : 6, w = 72, h = night ? 26 : 20, hw = w / 2 - 1;
  if (night) { g.fillStyle = '#3a3d4c'; g.fillRect(x0 + 8, -2, 1, y0 + 2); g.fillRect(x0 + w - 9, -2, 1, y0 + 2); }
  else { g.fillStyle = '#6a4a2a'; g.fillRect(x0 + 6, y0 + h, 1.5, 12); g.fillRect(x0 + w - 7.5, y0 + h, 1.5, 12); }
  g.fillStyle = night ? '#1b1c26' : '#204a2c'; g.fillRect(x0 - 2, y0 - 1, w + 4, h + 2);
  [[away, sc[0], x0], [home, sc[1], x0 + w / 2 + 1]].forEach(([t, v, x]) => {
    g.fillStyle = night ? '#05060a' : '#163a22'; g.fillRect(x, y0, hw, h);
    g.fillStyle = t.main; g.fillRect(x, y0, hw, 5);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = t.alt; g.font = 'bold 4px sans-serif'; g.fillText((t.name[lang] || t.name.zh).slice(0, lang === 'en' ? 10 : 2), x + hw / 2, y0 + 2.8);
    g.fillStyle = night ? '#ffcf3a' : '#ffffff'; g.font = 'bold ' + (night ? 13 : 10) + 'px monospace'; g.fillText(String(v), x + hw / 2, y0 + (night ? 16 : 13));
  });
}
function playBanner() {
  if (!cur) return;
  const M = TACTICS[cur.tac], team = teams[cur.off], name = M.name[lang], sub = M.name[lang === 'zh' ? 'en' : 'zh'];
  const head = T('playLabel') + ' · ' + (team.name[lang] || team.name.zh) + ' · ' + team.form;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = 'bold 7px sans-serif'; const w1 = g.measureText(name).width;
  g.font = '4px sans-serif'; const w2 = Math.max(g.measureText(sub).width, g.measureText(head).width);
  const w = Math.max(w1, w2) + 12, x = 5, y = 5;
  g.fillStyle = 'rgba(8,10,22,0.82)'; g.fillRect(x, y, w, 23);
  g.fillStyle = team.main; g.fillRect(x, y, 2, 23);
  g.font = 'bold 4px sans-serif'; g.fillStyle = shade(team.main === '#eeeeea' ? '#9aa0b0' : team.main, 0.45); g.fillText(head, x + 6, y + 6.5);
  g.font = 'bold 7px sans-serif'; g.fillStyle = '#ffd23a'; g.fillText(name, x + 6, y + 14.5);
  g.font = '4px sans-serif'; g.fillStyle = '#b8c0d8'; g.fillText(sub, x + 6, y + 20);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 2, y + 22, w - 2, 1);
  g.fillStyle = team.main; g.fillRect(x + 2, y + 22, (w - 2) * clamp(pt / cur.dur, 0, 1), 1);
}
function draw() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (!arenaImgs) { floorProj = projectFloor(); arenaImgs = [buildArena(false), buildArena(true)]; }
  const now = performance.now();
  g.drawImage(arenaImgs[now < cheerUntil && Math.floor(now / 170) % 2 ? 1 : 0], 0, 0);
  g.setTransform(S, 0, 0, S, 0, 0);
  overlays.length = 0;
  const list = [];
  [0, 1].forEach(side => list.push({ d: F.W / 2 - F.goalW / 2 - 0.2, f: () => goal(side, false) }, { d: F.W / 2 + F.goalW / 2 + 0.2, f: () => goal(side, true) }));
  [[0, 0], [F.L, 0], [0, F.W], [F.L, F.W]].forEach(([x, y]) => list.push({ d: y, f: () => flag(x, y) }));
  if (game) {
    drawBenches();
    [0, 1].forEach(sd => game.ts[sd].on.forEach(p => { const at = pos[p.id]; if (at && !p.sentOff) list.push({ d: at.y, f: () => drawPlayer(p, teams[sd], at, ball.holder === p.id) }); }));
    list.push({ d: ball.y + 0.05, f: drawBall });
  }
  list.sort((a, b) => a.d - b.d).forEach(o => o.f());
  const fx = fxOn && canFilter;
  if (fx) tiltShift();
  g.setTransform(S, 0, 0, S, 0, 0);
  scoreBoard();
  if (fx) glow();
  g.setTransform(S, 0, 0, S, 0, 0);
  overlays.forEach(o => o());
  playBanner();
  g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = 'bold 7px sans-serif';
  popups.forEach(o => {
    const q = P(o.x, o.y, 0), y = q.y - 30 - o.age * 4;
    g.globalAlpha = clamp(1 - o.age / 1.6, 0, 1);
    if (o.card) { g.fillStyle = o.card; g.fillRect(q.x - 2, y - 14, 4, 6); }
    g.fillStyle = '#000'; g.fillText(o.text, q.x + 0.5, y + 0.5); g.fillStyle = o.color; g.fillText(o.text, q.x, y);
  });
  g.globalAlpha = 1;
}

// ---------------- moving everyone: formation, the tactic's runs, the ball ----------------
function sideDir(side, period) { const second = F.periods === 4 ? period >= 3 : period >= 2; return (side === 0 ? 1 : -1) * (second ? -1 : 1); }
function absPt(side, period, depth, w) { return [sideDir(side, period) > 0 ? depth * F.L : (1 - depth) * F.L, F.W / 2 + clamp(w, -1, 1) * F.W / 2 * 0.9]; }
function depthOf(side, period, x) { return sideDir(side, period) > 0 ? x / F.L : 1 - x / F.L; }
const byId = id => { for (const s of [0, 1]) { const p = game.ts[s].on.find(q => q.id === id); if (p) return p; } return null; };
function ballNow() {                       // where the ball is at time pt of this attack, and who has it
  let st = { x: ball.x, y: ball.y, z: 0, holder: ball.holder };
  for (const e of cur.tl) {
    if (e.t > pt) break;
    const k = e.dur ? clamp((pt - e.t) / e.dur, 0, 1) : 1;
    if (e.k === 'hold') { st.holder = e.p; st.x = e.at[0]; st.y = e.at[1]; st.z = 0; }
    if (e.k === 'pass') { if (k < 1) { st.holder = null; st.x = lerp(e.at0[0], e.at1[0], k); st.y = lerp(e.at0[1], e.at1[1], k); st.z = (e.h || 0) * U * 4 * k * (1 - k); } else { st.holder = e.to; st.x = e.at1[0]; st.y = e.at1[1]; st.z = 0; } }
    if (e.k === 'dribble') { st.holder = e.p; st.x = lerp(e.at0[0], e.at1[0], k); st.y = lerp(e.at0[1], e.at1[1], k); st.z = 0; }
    if (e.k === 'shot') { st.holder = null; st.x = lerp(e.at0[0], e.at1[0], k); st.y = lerp(e.at0[1], e.at1[1], k); st.z = lerp(0.3, e.z || 0, k) + (e.type === 'header' ? 1.8 * (1 - k) : 0) + 1.2 * U * k * (1 - k); }
    if (e.k === 'goal') { const dx = Math.sign(st.x - F.L / 2); st.x = dx > 0 ? F.L + 0.8 : -0.8; st.z = 0.4; }
    if (e.k === 'save' || e.k === 'clear' || e.k === 'intercept' || e.k === 'tackle') st.holder = e.k === 'save' ? e.p : e.by;
    if (e.k === 'out') { st.holder = null; st.y = st.y < F.W / 2 ? -1 : F.W + 1; }
  }
  return st;
}
function computePositions(dtGame) {
  if (!cur || !game) return;
  const off = cur.off, def = 1 - off, per = cur.period, b = ballNow();
  if (b.holder != null) { const hp = pos[b.holder]; if (hp) { const d = sideDir(byId(b.holder) && game.ts[0].on.includes(byId(b.holder)) ? 0 : 1, per); b.x = hp.x + d * 0.6 * U; b.y = hp.y + 0.2; b.z = Math.abs(Math.sin(pt * 6)) * 0.15; } }
  ball = b;
  const bd = depthOf(off, per, b.x), bw = clamp((b.y - F.W / 2) / (F.W / 2), -1, 1);
  const first = cur.tl.find(e => e.k === 'pass' || e.k === 'dribble' || e.k === 'shot'), live = first && pt >= first.t - 0.5;
  const sA = clamp(bd - 0.3, -0.08, 0.42), sD = clamp((1 - bd - 0.5) * 0.5, -0.15, 0.2) - 0.05;
  const target = {}, wob = (i, a) => Math.sin(pt * (0.6 + i * 0.11) + i * 1.7) * a;
  [0, 1].forEach(s => game.ts[s].on.forEach((p, i) => {
    if (p.sentOff) return;
    const slot = game.ts[s].slots[p.slot] || game.ts[s].slots[1], sp = slotSpot(slot);
    let d, w;
    if (p.pos === 'GK' && slot.pos === 'GK') { d = 0.022 + (s === off ? 0.04 * bd : 0); w = clamp(bw * 0.3, -0.25, 0.25) * F.goalW / F.W * 2.2; }
    else { d = sp[0] + (s === off ? sA : sD); w = sp[1] * 0.85 + bw * 0.22; }
    // set pieces while the ball is dead
    if (!live) {
      if (cur.tac === 'corner' && p.pos !== 'GK') { d = s === off ? 0.86 + (i % 4) * 0.025 : 1 - (0.9 + (i % 3) * 0.03); w = ((i * 37) % 9 - 4) / 6 * (F.box[1] / F.W); if (s === off && i > 5) d = 0.62; }
      if (cur.tac === 'penalty' && p.pos !== 'GK') { d = s === off ? Math.min(d, 0.78) : 1 - Math.max(1 - d, 0.8); }
      if (cur.tac === 'freekick' && s === def && p.pos === 'DF' && i <= 3) { const tgt = depthOf(def, per, b.x); d = (1 - tgt) + 0; d = clamp(1 - (bd + 9.15 / F.L * (F.n >= 11 ? 1 : 0.6)), 0.02, 1); w = bw * 0.7 + (i - 2) * 0.04; }
      if (cur.kind === 'kickoff' || !cur.kind) d = Math.min(d, 0.47);
    }
    if (cur.tac === 'buildout' && s === def && F.buildOut && (!live || pt < first.t + first.dur + 0.5)) d = Math.min(d, 1 - F.buildOut / F.L - 0.02);   // stay behind the build-out line
    target[p.id] = absPt(s, per, clamp(d, 0.01, 0.99), w + wob(i + s * 11, 0.03));
  }));
  // what the tactic makes people do: receivers run to the pass, runners make their runs, the shooter shoots, the keeper dives
  let goalEv = null;
  for (const e of cur.tl) {
    if (e.k === 'pass' && pt >= e.t - 1.4 && pt <= e.t + e.dur + 0.2) target[e.to] = e.at1;
    if (e.k === 'run' && pt >= e.t && pt <= e.t + e.dur + 1) target[e.p] = [lerp(e.at0[0], e.at1[0], clamp((pt - e.t) / e.dur, 0, 1)), lerp(e.at0[1], e.at1[1], clamp((pt - e.t) / e.dur, 0, 1))];
    if (e.k === 'dribble' && pt >= e.t && pt <= e.t + e.dur) target[e.p] = [lerp(e.at0[0], e.at1[0], (pt - e.t) / e.dur), lerp(e.at0[1], e.at1[1], (pt - e.t) / e.dur)];
    if (e.k === 'shot' && pt >= e.t - 1 && pt <= e.t + e.dur + 0.6) { target[e.p] = e.at0; if (e.res !== 'wide' && e.res !== 'block') { const gk = e.gk; target[gk] = [e.at1[0] - Math.sign(e.at1[0] - F.L / 2) * 0.6, e.at1[1]]; } }
    if (e.k === 'goal' && pt >= e.t) goalEv = e;
  }
  if (b.holder != null && target[b.holder] == null) target[b.holder] = [b.x, b.y];
  // the nearest defenders press the ball
  const hold = b.holder != null ? pos[b.holder] : null;
  if (hold && live) {
    const dd = game.ts[def].on.filter(p => !p.sentOff && p.pos !== 'GK').map(p => ({ p, d: pos[p.id] ? Math.hypot(pos[p.id].x - hold.x, pos[p.id].y - hold.y) : 99 })).sort((a, c) => a.d - c.d);
    const gdir = -sideDir(def, per);
    dd.slice(0, 2).forEach((o, k) => { target[o.p.id] = [hold.x - gdir * (2 + k * 3) * U * 0.6, hold.y + (k ? (o.p.id % 2 ? 2 : -2) * U : 0)]; });
  }
  if (goalEv) {                                                // celebrate in the corner
    const sc = game.ts[goalEv.side], fx = sideDir(goalEv.side, per) > 0 ? F.L - 2 : 2, fy = F.W - 2;
    sc.on.forEach((p, i) => { if (p.pos !== 'GK') target[p.id] = p.id === goalEv.p ? [fx, fy] : [fx - sideDir(goalEv.side, per) * (2 + i % 4) * U, fy - (i % 3) * U]; });
  }
  [0, 1].forEach(s => game.ts[s].on.forEach(p => {
    const to = target[p.id]; if (!to) return;
    const cur2 = pos[p.id] || { x: to[0], y: to[1] }, dx = to[0] - cur2.x, dy = to[1] - cur2.y, dist = Math.hypot(dx, dy);
    const vmax = (4.5 + p.r.pac / 25) * (F.n < 11 ? 0.8 : 1) * dtGame;
    const k = dist > vmax ? vmax / dist : 1;
    const shot = cur.tl.find(e => e.k === 'shot' && e.gk === p.id && pt >= e.t && pt <= e.t + e.dur + 0.8 && (e.res === 'save' || e.res === 'goal'));
    pos[p.id] = { x: cur2.x + dx * k, y: cur2.y + dy * k, moving: dist > 0.15, dive: shot ? (shot.at1[1] > cur2.y ? 1.2 : -1.2) * clamp((pt - shot.t) / 0.4, 0, 1) : 0 };
  }));
}
function placeKickoff() {
  pos = {};
  [0, 1].forEach(s => game.ts[s].on.forEach(p => {
    const sp = slotSpot(game.ts[s].slots[p.slot]), a = absPt(s, game.period, Math.min(sp[0] + 0.05, 0.47), sp[1] * 0.85);
    pos[p.id] = { x: a[0], y: a[1] };
  }));
  ball = { x: F.L / 2, y: F.W / 2, z: 0, holder: null };
}

// ---------------- playing the attacks back ----------------
let shownTl = 0;
function startPhase() {
  if (game.over) return false;
  cur = game.step(); pt = 0; shownTl = 0;
  return !!cur;
}
function liveScore() {
  if (!game) return [0, 0];
  const s = game.score.slice();
  if (cur) cur.tl.forEach(e => { if (e.k === 'goal' && e.t > pt) s[e.side]--; });
  return s;
}
function popup(text, x, y, color, card) { if (popups.length >= 4) popups.shift(); popups.push({ text, x, y, age: 0, color, card }); }
function tick(dt) {
  if (!playing || !game) return;
  if (!cur && !startPhase()) return;
  const dtGame = dt * speed;
  pt += dtGame;
  popups.forEach(o => { o.age += dtGame / 3; }); popups = popups.filter(o => o.age < 1.6);
  const PU = T('popup');
  while (shownTl < cur.tl.length && cur.tl[shownTl].t <= pt) {
    const e = cur.tl[shownTl++], at = e.at || e.at1 || (pos[e.p] ? [pos[e.p].x, pos[e.p].y] : [ball.x, ball.y]);
    if (e.k === 'goal') { popup(PU.goal, ball.x, ball.y, '#ffe14a'); cheerUntil = performance.now() + 2600; }
    if (e.k === 'save') popup(PU.save, at[0], at[1], '#7ae0ff');
    if (e.k === 'offside') popup(PU.offside, at[0], at[1], '#ffb04a');
    if (e.k === 'foul') popup(PU.foul, at[0], at[1], '#ff7a7a');
    if (e.k === 'card') { const p = pos[e.p]; if (p) popup(PU[e.color], p.x, p.y, e.color === 'red' ? '#ff5a5a' : '#ffe14a', e.color === 'red' ? '#e02020' : '#ffd400'); }
    if (e.k === 'clear') popup(PU.clear, at[0], at[1], '#9ad8ff');
    if (e.k === 'shot' && e.res === 'post') popup(PU.post, e.at1[0], e.at1[1], '#ffffff');
    if (e.k === 'phase' && e.tac === 'buildout') popup(PU.buildout, at[0], at[1], '#fff09a');
    if (e.k === 'intercept' || e.k === 'tackle') popup(PU[e.k], at[0], at[1], '#9dffb0');
  }
  while (logShown < cur.log.length && cur.log[logShown].t != null && cur.log[logShown].t <= pt) showEvent(cur.log[logShown++]);
  if (pt >= cur.dur + 0.4) {
    while (logShown < cur.log.length) showEvent(cur.log[logShown++]);
    const per = cur.period, wasOver = game.over;
    cur = null; logShown = 0;
    if (wasOver) { endGame(); return; }
    if (game.period !== per) placeKickoff();
    renderSide();
  }
}
let last = performance.now();
function frame() {
  const now = performance.now(), dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  tick(dt);
  if (cur) computePositions(dt * speed);
  draw(); drawPlaybook(); renderBoard();
  requestAnimationFrame(frame);
}

// ---------------- the playbook: the attack drawn on a little tactics board ----------------
const pbc = $('pbBoard'), pg = pbc.getContext('2d');
let pbShown;
function pbText() {
  if (!cur) { $('pbName').textContent = '—'; $('pbDesc').textContent = T('pbWait'); $('pbForm').innerHTML = ''; return; }
  const M = TACTICS[cur.tac], team = teams[cur.off];
  $('pbName').innerHTML = '<span style="color:' + team.main + '">■</span> ' + esc(M.name[lang]) + ' <small>' + esc(M.name[lang === 'zh' ? 'en' : 'zh']) + '</small>';
  $('pbDesc').textContent = M.desc[lang];
  $('pbForm').innerHTML = [0, 1].map(s => '<span><i style="background:' + teams[s].main + '"></i>' + esc(teams[s].name[lang]) + ' · ' + T('formation') + ' ' + teams[s].form + ' · ' + T('press')[teams[s].press] + '</span>').join('');
}
function drawPlaybook() {
  if (!cur && pbShown !== undefined) return;
  if (cur !== pbShown) { pbShown = cur; pbText(); }
  const Wb = pbc.width, Hb = pbc.height, m = 14, sx = (Wb - 2 * m) / F.L, sy = (Hb - 2 * m) / F.W;
  pg.setTransform(1, 0, 0, 1, 0, 0);
  pg.fillStyle = '#2f7a34'; pg.fillRect(0, 0, Wb, Hb);
  for (let i = 0; i < 10; i++) { pg.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'; pg.fillRect(m + i * (Wb - 2 * m) / 10, m, (Wb - 2 * m) / 10, Hb - 2 * m); }
  if (!cur) { drawPitchLines(m, sx, sy, Wb, Hb); return; }
  // always attacking left → right on the board
  const off = cur.off, flip = sideDir(off, cur.period) < 0;
  const X = x => m + (flip ? F.L - x : x) * sx, Y = y => m + (flip ? F.W - y : y) * sy;
  drawPitchLines(m, sx, sy, Wb, Hb);
  const team = teams[off], arrow = (x1, y1, x2, y2, col, dash, lw) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    pg.strokeStyle = col; pg.fillStyle = col; pg.lineWidth = lw || 2.2; pg.setLineDash(dash || []);
    pg.beginPath(); pg.moveTo(x1, y1); pg.lineTo(x2 - Math.cos(a) * 5, y2 - Math.sin(a) * 5); pg.stroke(); pg.setLineDash([]);
    pg.beginPath(); pg.moveTo(x2, y2); pg.lineTo(x2 - Math.cos(a - 0.45) * 9, y2 - Math.sin(a - 0.45) * 9); pg.lineTo(x2 - Math.cos(a + 0.45) * 9, y2 - Math.sin(a + 0.45) * 9); pg.closePath(); pg.fill();
  };
  cur.tl.forEach(e => {
    const done = e.t <= pt, col = a => done ? a : 'rgba(255,255,255,0.35)';
    if (e.k === 'pass') arrow(X(e.at0[0]), Y(e.at0[1]), X(e.at1[0]), Y(e.at1[1]), col(e.h > 2 ? '#9ad8ff' : '#ffffff'), [6, 4]);
    if (e.k === 'dribble') arrow(X(e.at0[0]), Y(e.at0[1]), X(e.at1[0]), Y(e.at1[1]), col('#ffe14a'), [], 2.6);
    if (e.k === 'run') arrow(X(e.at0[0]), Y(e.at0[1]), X(e.at1[0]), Y(e.at1[1]), col('#ffd23a'), [2, 3]);
    if (e.k === 'shot') arrow(X(e.at0[0]), Y(e.at0[1]), X(e.at1[0]), Y(e.at1[1]), col('#ff4a4a'), [], 2.8);
  });
  const shooter = (cur.tl.find(e => e.k === 'shot') || {}).p;
  [0, 1].forEach(s => game.ts[s].on.forEach(p => {
    const q = pos[p.id]; if (!q || p.sentOff) return;
    const x = X(q.x), y = Y(q.y);
    if (s === off) { pg.fillStyle = p.id === shooter ? '#ffd23a' : '#ffffff'; pg.strokeStyle = team.main; pg.lineWidth = 2.5; pg.beginPath(); pg.arc(x, y, 7.5, 0, Math.PI * 2); pg.fill(); pg.stroke(); pg.fillStyle = '#111'; pg.font = 'bold 9px sans-serif'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.fillText(String(p.num), x, y + 0.5); }
    else { pg.strokeStyle = teams[s].main === '#eeeeea' ? '#cfd3dc' : teams[s].main; pg.lineWidth = 2.4; pg.beginPath(); pg.moveTo(x - 4, y - 4); pg.lineTo(x + 4, y + 4); pg.moveTo(x + 4, y - 4); pg.lineTo(x - 4, y + 4); pg.stroke(); }
  }));
  pg.fillStyle = '#ffffff'; pg.strokeStyle = '#111'; pg.lineWidth = 1; pg.beginPath(); pg.arc(X(ball.x), Y(ball.y), 4, 0, Math.PI * 2); pg.fill(); pg.stroke();
}
function drawPitchLines(m, sx, sy, Wb, Hb) {
  pg.strokeStyle = 'rgba(255,255,255,0.85)'; pg.lineWidth = 1.6;
  pg.strokeRect(m, m, Wb - 2 * m, Hb - 2 * m);
  pg.beginPath(); pg.moveTo(Wb / 2, m); pg.lineTo(Wb / 2, Hb - m); pg.stroke();
  pg.beginPath(); pg.arc(Wb / 2, Hb / 2, (F.n >= 11 ? 9.15 : 5) * sx, 0, Math.PI * 2); pg.stroke();
  [0, 1].forEach(sd => {
    const x0 = sd ? Wb - m - F.box[0] * sx : m;
    pg.strokeRect(x0, Hb / 2 - F.box[1] / 2 * sy, F.box[0] * sx, F.box[1] * sy);
    pg.fillStyle = '#ffffff'; pg.fillRect(sd ? Wb - m : m - 3, Hb / 2 - F.goalW / 2 * sy, 3, F.goalW * sy);
    if (F.buildOut) { pg.save(); pg.setLineDash([4, 4]); pg.strokeStyle = 'rgba(255,240,160,0.9)'; const bx = sd ? Wb - m - F.buildOut * sx : m + F.buildOut * sx; pg.beginPath(); pg.moveTo(bx, m); pg.lineTo(bx, Hb - m); pg.stroke(); pg.restore(); }
  });
}

// ---------------- play-by-play ----------------
function minuteStr(e) { const c = e.clock || 0, base = F.periods === 4 ? 0 : (e.period || game.period) > 1 ? F.len / 60 : 0, mm = c / 60; return mm >= F.len / 60 && F.stoppage ? Math.floor(base + F.len / 60) + "+" + Math.max(1, Math.ceil(mm - F.len / 60)) + "'" : Math.floor(base + mm) + 1 + "'"; }
function addLog(o) {
  const li = document.createElement('li'); li.className = o.cls || '';
  li.innerHTML = '<span class="tm">' + o.tm + '</span><span>' + o.text + '</span>';
  const ol = $('log'); ol.insertBefore(li, ol.firstChild);
  while (ol.children.length > 500) ol.removeChild(ol.lastChild);
}
function eventText(e) {
  const E = TX[lang].ev;
  if (e.k === 'play') return '<span class="pl">' + T('playRun') + esc(TACTICS[e.tac].name[lang]) + '</span>';
  if (e.k === 'sub') return E.sub(null, { innName: nm(e.inn) + (e.inn.star ? '★' : ''), outName: nm(e.out) });
  if (e.k === 'corner' || e.k === 'buildout') return E[e.k]();
  const f = E[e.k]; if (!f || !e.p) return null;
  return f(esc(nm(e.p)) + (e.p.star ? '★' : ''), Object.assign({}, e, { by: e.by && esc(nm(e.by)), ast: e.ast && esc(nm(e.ast)), on: e.on && esc(nm(e.on)) }));
}
function showEvent(e) {
  if (e.k === 'periodEnd') { addLog({ cls: 'period', tm: '', text: T('period')(e.period, F) + ' ' + (lang === 'zh' ? '結束' : 'ends') + '　' + tn(teams[0]) + ' ' + e.score[0] + ' – ' + e.score[1] + ' ' + tn(teams[1]) }); return; }
  if (e.k === 'final') { addLog({ cls: 'period', tm: '', text: T('final') + '：' + (e.winner < 0 ? (lang === 'zh' ? '雙方戰平' : 'a draw') : tn(teams[e.winner]) + (lang === 'zh' ? ' 獲勝！' : ' win!')) }); return; }
  if (e.k === 'play' && !['corner', 'penalty', 'freekick', 'buildout', 'counter'].includes(e.tac) && Math.random() < 0.6) return;    // keep the log readable
  const text = eventText(e); if (!text) return;
  const team = teams[e.side];
  const cls = e.k === 'goal' ? 'big' : e.k === 'sub' ? 'sub' : ['red', 'pen', 'save', 'post'].includes(e.k) ? 'score' : '';
  addLog({ cls, tm: minuteStr(e), text: '<span style="color:' + team.main + '">■</span> ' + text });
}

// ---------------- panels ----------------
function renderBoard() {
  if (!game) return;
  const sc = liveScore(), period = cur ? cur.period : game.period, clock = cur ? cur.clock0 + Math.min(pt, cur.dur) : game.clock;
  const base = F.periods === 4 ? 0 : (period - 1) * F.len, mins = (base + Math.min(clock, F.len)) / 60, extra = F.stoppage && clock > F.len ? Math.ceil((clock - F.len) / 60) : 0;
  const side = s => {
    const t = teams[s], st = game.ts[s].st;
    return '<div class="team' + (s ? ' right' : '') + '"><div class="swatch" style="background:' + t.main + ';border-color:' + t.alt + '"></div><div><div class="tname">' + esc(tn(t)) + '</div>' +
      '<div class="trec">' + T('rec')(t.W, t.D, t.L) + ' · ' + t.form + ' · ' + T('press')[t.press] + (st.RC ? ' · 🟥×' + st.RC : '') + '</div></div><div class="tscore">' + sc[s] + '</div></div>';
  };
  const clockTxt = F.periods === 4 ? Math.floor(clock / 60) + ':' + String(Math.floor(clock % 60)).padStart(2, '0') : Math.floor(mins) + ':' + String(Math.floor((mins * 60) % 60)).padStart(2, '0') + (extra ? ' <small>+' + extra + '</small>' : '');
  const S2 = game.ts.map(T2 => T2.st), totPos = S2[0].POS + S2[1].POS || 1;
  const bar = (k, a, b, fmt) => { const tot = a + b || 1; return '<div class="sbar"><span>' + (fmt ? fmt(a) : a) + '</span><i><b style="width:' + (a / tot * 100) + '%;background:' + teams[0].main + '"></b><b style="width:' + (b / tot * 100) + '%;background:' + teams[1].main + '"></b></i><span>' + (fmt ? fmt(b) : b) + '</span><em>' + T('stats')[k] + '</em></div>'; };
  const stats = bar('POS', S2[0].POS / totPos * 100, S2[1].POS / totPos * 100, v => Math.round(v) + '%') + bar('SH', S2[0].SH, S2[1].SH) + bar('SOT', S2[0].SOT, S2[1].SOT) + bar('CK', S2[0].CK, S2[1].CK) + bar('FL', S2[0].FL, S2[1].FL);
  const html = side(0) + '<div class="mid"><div class="period">' + (game.over && !cur ? T('final') : T('period')(period, F)) + ' · ' + fmtKey + '</div><div class="clock">' + clockTxt + '</div>' + stats + '</div>' + side(1);
  if (html !== renderBoard.last) { $('board').innerHTML = html; renderBoard.last = html; }
  // the player on the ball and the closest opponent
  const off = cur ? cur.off : game.poss, holder = (ball.holder != null && byId(ball.holder)) || game.ts[off].on.find(p => p.pos === 'MF') || game.ts[off].on[1];
  const hs = game.ts[0].on.includes(holder) ? 0 : 1, hp = pos[holder.id];
  const opp = game.ts[1 - hs].on.filter(p => !p.sentOff).map(p => ({ p, d: hp && pos[p.id] ? Math.hypot(pos[p.id].x - hp.x, pos[p.id].y - hp.y) : 99 })).sort((a, c) => a.d - c.d)[0].p;
  const key = holder.id + '|' + opp.id + '|' + lang + '|' + Math.round(holder.e / 5) + '|' + holder.g.GL + '|' + opp.g.TK;
  if (key !== renderBoard.cards) { renderBoard.cards = key; $('cardO').innerHTML = card(holder, T('onBall')); $('cardD').innerHTML = card(opp, T('marking')); }
}
function card(p, role) {
  const t = p.team, keys = p.pos === 'GK' ? ['gk', 'phy', 'pas', 'pac'] : ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
  return '<h3><span class="chip" style="background:' + t.main + '"></span>#' + p.num + ' ' + esc(nm(p)) + star(p) + ' <span class="role">' + POS_NAME[lang][p.pos] + ' · ' + p.hgt + 'cm · ' + role + '</span></h3>' +
    keys.map(k => '<div class="rt"><span>' + T('rt')[k] + '</span><i><b style="width:' + p.r[k] + '%"></b></i><span>' + p.r[k] + '</span></div>').join('') +
    '<div class="rt"><span>' + T('energy') + '</span><i><b style="width:' + Math.round(p.e) + '%;background:' + (p.e > 60 ? '#4cd07a' : '#ff7a3a') + '"></b></i><span>' + Math.round(p.e) + '</span></div>' +
    '<div class="line">' + T('today') + '：' + p.g.GL + ' G · ' + p.g.A + ' A · ' + p.g.SH + ' SH · ' + p.g.PC + '/' + p.g.PA + ' PAS' + (p.pos === 'GK' ? ' · ' + p.g.SV + ' SV' : ' · ' + p.g.TK + ' TK') + '</div>';
}
function rating(g2, p) {
  const r = 6 + g2.GL * 1.1 + g2.A * 0.7 + g2.SOT * 0.15 + g2.TK * 0.12 + g2.SV * 0.35 + (g2.PA ? (g2.PC / g2.PA - 0.75) * 2 : 0) - g2.YC * 0.4 - g2.RC * 2 - g2.FL * 0.1;
  return clamp(r, 3, 10).toFixed(1);
}
function renderBox() {
  const cols = ['MIN', 'G', 'A', 'SH', 'SOT', 'PAS', 'TK', 'SV', 'FL', '🟨🟥', 'RAT'];
  $('pane-box').innerHTML = [0, 1].map(s => {
    const t = teams[s], on = game.ts[s].on, rows = t.roster.filter(p => p.g.MIN > 0 || on.includes(p)).sort((a, b) => (b.starter - a.starter) || (b.g.MIN - a.g.MIN));
    const st = game.ts[s].st;
    return '<table class="box"><tr><th style="color:' + t.main + '">' + esc(tn(t)) + '</th>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr>' +
      rows.map(p => { const g2 = p.g; return '<tr class="' + (on.includes(p) && !p.sentOff ? 'on' : '') + '"><td>#' + p.num + ' ' + esc(nm(p)) + star(p) + ' <small style="color:#9aa2bd">' + p.pos + '</small></td><td>' + Math.round(g2.MIN) + '</td><td>' + g2.GL + '</td><td>' + g2.A + '</td><td>' + g2.SH + '</td><td>' + g2.SOT + '</td><td>' + g2.PC + '/' + g2.PA + '</td><td>' + g2.TK + '</td><td>' + g2.SV + '</td><td>' + g2.FL + '</td><td>' + (g2.YC ? '🟨' : '') + (g2.RC ? '🟥' : '') + '</td><td>' + rating(g2, p) + '</td></tr>'; }).join('') +
      '<tr class="total"><td>' + T('total') + '</td><td></td><td>' + rows.reduce((a, p) => a + p.g.GL, 0) + '</td><td>' + rows.reduce((a, p) => a + p.g.A, 0) + '</td><td>' + st.SH + '</td><td>' + st.SOT + '</td><td>' + st.PC + '/' + st.PA + '</td><td></td><td></td><td>' + st.FL + '</td><td>' + (st.YC ? st.YC + '🟨' : '') + (st.RC ? st.RC + '🟥' : '') + '</td><td>xG ' + st.XG.toFixed(1) + '</td></tr></table>';
  }).join('');
}
function renderRoster() {
  const keys = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'gk', 'sta'];
  const cell = v => '<td class="' + (v >= 80 ? 'r-hi' : v < 45 ? 'r-lo' : '') + '">' + v + '</td>';
  $('pane-roster').innerHTML = [0, 1].map(s => {
    const t = teams[s];
    return '<table class="box"><tr><th style="color:' + t.main + '">' + esc(tn(t)) + ' <small>' + t.form + '</small></th><th>' + T('pos') + '</th>' + keys.map(k => '<th>' + T('rt')[k] + '</th>').join('') + '<th>' + T('ovr') + '</th><th>G</th></tr>' +
      t.roster.map(p => '<tr><td>#' + p.num + ' ' + esc(nm(p)) + star(p) + '</td><td>' + p.pos + '</td>' + keys.map(k => cell(p.r[k])).join('') + cell(ovr(p)) + '<td>' + p.s.GL + '</td></tr>').join('') + '</table>';
  }).join('');
}
function renderRules() {
  $('pane-rules').innerHTML = '<h3>' + fmtKey + ' · ' + F.age[lang] + (F.n < 11 ? ' · ' + T('kids') : '') + '</h3><ul class="rules">' + RULES[lang][fmtKey].map(r => '<li>' + esc(r) + '</li>').join('') + '</ul>';
}
function renderSide() {
  const tab = document.querySelector('.tabs button.on').dataset.tab;
  if (tab === 'box') renderBox();
  if (tab === 'roster') renderRoster();
  if (tab === 'rules') renderRules();
}
function setPlaying(on) {
  playing = on;
  $('play').textContent = game && game.over ? T('play') : on ? T('pause') : (cur || (game && game.log.length) ? T('resume') : T('play'));
  $('play').disabled = !!(game && game.over);
}
function renderAll() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.getAttribute('data-t')); });
  document.title = T('title') + ' · ' + (lang === 'zh' ? 'Pixel Soccer' : '像素足球');
  $('sim').textContent = T('sim'); $('next').textContent = T('next'); $('newTeams').textContent = T('newTeams'); $('lang').textContent = T('lang');
  $('fx').textContent = T('fx')(fxOn && canFilter); $('fx').disabled = !canFilter;
  [].forEach.call($('fmt').options, o => { const f = FORMATS[o.value]; o.textContent = o.value + ' · ' + f.age[lang]; });
  setPlaying(playing);
  arenaImgs = null; pbShown = undefined; renderBoard.last = null; renderBoard.cards = null;
  renderSide();
}
function endGame() { setPlaying(false); $('play').disabled = true; $('next').disabled = false; saveTeams(); renderBox(); renderSide(); }
function newGame(fresh) {
  F = FORMATS[fmtKey]; setCamera();
  if (fresh || !teams || teams[0].fmt !== fmtKey) teams = (!fresh && loadTeams()) || makeMatch(fmtKey);
  Object.keys(spriteCache).forEach(k => delete spriteCache[k]);
  teams.forEach(t => t.roster.forEach(p => { delete p.look; }));
  saveTeams();
  game = new Game(teams[0], teams[1], fmtKey);
  cur = null; pt = 0; popups = []; logShown = 0;
  $('log').innerHTML = '';
  addLog({ cls: 'period', tm: '', text: (lang === 'zh' ? '開球 — ' : 'Kick-off — ') + tn(teams[0]) + ' vs ' + tn(teams[1]) + ' · ' + fmtKey });
  setPlaying(false); $('next').disabled = true;
  placeKickoff(); renderAll();
}

// ---------------- controls ----------------
$('play').onclick = () => { if (!game.over) setPlaying(!playing); };
$('speed').onchange = e => { speed = +e.target.value; };
$('sim').onclick = () => {
  if (game.over) return;
  if (cur) { while (logShown < cur.log.length) showEvent(cur.log[logShown++]); cur = null; }
  let r; while (!game.over && (r = game.step())) { cur = r; r.log.forEach(showEvent); }
  cur = null; placeKickoff(); endGame();
};
$('next').onclick = () => newGame(false);
$('newTeams').onclick = () => { if (!game.log.length || game.over || confirm(lang === 'zh' ? '重新組隊會結束這場比賽，確定嗎？' : 'Make new teams and end this match?')) { setPlaying(false); cur = null; newGame(true); } };
$('fmt').onchange = e => { fmtKey = e.target.value; try { localStorage.setItem('soccer.fmt', fmtKey); } catch (x) { /* ignore */ } setPlaying(false); cur = null; teams = null; newGame(false); };
$('fx').onclick = () => { fxOn = !fxOn; try { localStorage.setItem('soccer.fx', fxOn ? 'on' : 'off'); } catch (e) { /* ignore */ } $('fx').textContent = T('fx')(fxOn && canFilter); };
$('lang').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; try { localStorage.setItem('soccer.lang', lang); } catch (e) { /* ignore */ } renderAll(); };
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + b.dataset.tab));
  renderSide();
});
setInterval(() => { if (playing) renderSide(); }, 1000);
document.addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); $('play').click(); } });

const qs = new URLSearchParams(location.search);
if (qs.has('fmt') && FORMATS[qs.get('fmt')]) fmtKey = qs.get('fmt');
$('fmt').value = fmtKey;
if (qs.has('lang')) lang = qs.get('lang') === 'en' ? 'en' : 'zh';
newGame(false);
if (qs.has('speed')) { speed = +qs.get('speed'); $('speed').value = qs.get('speed'); }
if (qs.has('auto')) setPlaying(true);
if (qs.has('warp')) { const n = +qs.get('warp') * 60; setPlaying(true); for (let i = 0; i < n; i++) { tick(1 / 60); if (cur) computePositions(speed / 60); } }
requestAnimationFrame(frame);
window.SOCCER_UI = { get game() { return game; }, get cur() { return cur; }, get pt() { return pt; }, tick, computePositions };
})();
