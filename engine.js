// 足球模擬引擎：依球員能力和戰術逐波進攻模擬比賽，支援 11 人制和兒童的 9、7、6、5 人制，並產生給畫面播放的時間軸
// Soccer simulation: attack by attack, driven by player ratings and named tactics, for 11v11 and the
// small-sided youth formats (9v9, 7v7, 6v6, 5v5); every attack comes with a timeline for the pitch animation.
// Pitch coordinates are in meters: x 0–L along the pitch, y 0–W across (y = 0 is the far touchline).
(function (root) {
'use strict';

let R = Math.random;
function setRandom(f) { R = f || Math.random; }
function gauss() { let u = 0, v = 0; while (u === 0) u = R(); while (v === 0) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pick = a => a[Math.floor(R() * a.length)];
function pickW(list, w) { let s = 0; const ws = list.map((x, i) => { const v = Math.max(0, w(x, i)); s += v; return v; }); let r = R() * s; for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; }

// ---------------- the formats ----------------
// periods × len (seconds) · goal width/height · penalty box depth/width · build-out line (meters from goal)
// offside: 'full' | 'buildout' (only between the build-out line and the goal line) | 'none' · heading allowed? · cards?
const FORMATS = {
  '11v11': { n: 11, roster: 18, L: 105, W: 68, periods: 2, len: 2700, goalW: 7.32, goalH: 2.44, box: [16.5, 40.3], six: [5.5, 18.3], spot: 11, buildOut: 0, offside: 'full', heading: true, cards: true, subs: 5, gk: 0, stoppage: true,
    forms: ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '4-1-4-1'], venue: 'stadium', age: { zh: '13 歲以上・正式比賽', en: 'U13+ · full rules' } },
  '9v9': { n: 9, roster: 14, L: 73, W: 46, periods: 2, len: 1800, goalW: 6.4, goalH: 2.13, box: [12.8, 32], six: [4.6, 14], spot: 9.1, buildOut: 24.8, offside: 'full', heading: true, cards: true, subs: 'rolling', gk: -6,
    forms: ['3-2-3', '3-3-2', '2-3-3'], venue: 'school', age: { zh: 'U11–U12', en: 'U11–U12' } },
  '7v7': { n: 7, roster: 12, L: 60, W: 40, periods: 2, len: 1500, goalW: 5.5, goalH: 1.83, box: [11, 26], six: [3.7, 11], spot: 8.2, buildOut: 20.5, offside: 'buildout', heading: false, cards: false, subs: 'rolling', gk: -12,
    forms: ['2-3-1', '3-2-1', '2-1-2-1'], venue: 'park', age: { zh: 'U9–U10', en: 'U9–U10' } },
  '6v6': { n: 6, roster: 9, L: 50, W: 30, periods: 4, len: 720, goalW: 4.5, goalH: 1.83, box: [9, 20], six: [3, 9], spot: 7, buildOut: 0, offside: 'none', heading: false, cards: false, subs: 'rolling', gk: -16,
    forms: ['2-2-1', '3-1-1', '2-1-2'], venue: 'park', age: { zh: 'U8–U9', en: 'U8–U9' } },
  '5v5': { n: 5, roster: 8, L: 40, W: 25, periods: 4, len: 600, goalW: 4.0, goalH: 1.8, box: [8, 16], six: [2.5, 8], spot: 6, buildOut: 0, offside: 'none', heading: false, cards: false, subs: 'rolling', gk: -20,
    forms: ['2-1-1', '1-2-1', '2-2'], venue: 'park', age: { zh: 'U6–U8', en: 'U6–U8' } }
};
function parseForm(f) {                       // '4-2-3-1' → slots from the back: [{pos, line, k, of}]
  const lines = f.split('-').map(Number), slots = [{ pos: 'GK', line: -1, k: 0, of: 1 }];
  lines.forEach((c, li) => { for (let k = 0; k < c; k++) slots.push({ pos: li === 0 ? 'DF' : li === lines.length - 1 ? 'FW' : 'MF', line: li, k, of: c, lines: lines.length }); });
  return slots;
}
// where a formation slot stands in its own half when the ball is in the middle: depth 0 (own goal) … 1 (their goal), width −1 … 1
function slotSpot(s) {
  if (s.pos === 'GK') return [0.03, 0];
  const depth = s.lines === 1 ? 0.4 : 0.2 + (s.line / (s.lines - 1)) * 0.3, w = s.of === 1 ? 0 : -0.78 + 1.56 * s.k / (s.of - 1);
  return [depth, w];
}

const POS = ['GK', 'DF', 'MF', 'FW'];
const POS_NAME = { zh: { GK: '守門員', DF: '後衛', MF: '中場', FW: '前鋒' }, en: { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' } };
const RATINGS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'gk', 'sta'];

// ---------------- names ----------------
const SUR = [['陳', 'Chen'], ['林', 'Lin'], ['黃', 'Huang'], ['張', 'Chang'], ['李', 'Lee'], ['王', 'Wang'], ['吳', 'Wu'], ['劉', 'Liu'], ['蔡', 'Tsai'], ['楊', 'Yang'],
  ['許', 'Hsu'], ['鄭', 'Cheng'], ['謝', 'Hsieh'], ['郭', 'Kuo'], ['洪', 'Hung'], ['曾', 'Tseng'], ['邱', 'Chiu'], ['廖', 'Liao'], ['賴', 'Lai'], ['周', 'Chou'],
  ['徐', 'Hsu'], ['蘇', 'Su'], ['葉', 'Yeh'], ['莊', 'Chuang'], ['呂', 'Lu'], ['江', 'Chiang'], ['何', 'Ho'], ['蕭', 'Hsiao'], ['羅', 'Lo'], ['高', 'Kao'],
  ['潘', 'Pan'], ['簡', 'Chien'], ['朱', 'Chu'], ['鍾', 'Chung'], ['彭', 'Peng'], ['游', 'Yu'], ['詹', 'Chan'], ['胡', 'Hu'], ['施', 'Shih'], ['沈', 'Shen']];
const GIV = [['志', 'Chih'], ['俊', 'Chun'], ['建', 'Chien'], ['家', 'Chia'], ['冠', 'Kuan'], ['宗', 'Tsung'], ['承', 'Cheng'], ['柏', 'Po'], ['彥', 'Yen'], ['睿', 'Jui'],
  ['宇', 'Yu'], ['哲', 'Che'], ['嘉', 'Chia'], ['文', 'Wen'], ['信', 'Hsin'], ['明', 'Ming'], ['國', 'Kuo'], ['偉', 'Wei'], ['勝', 'Sheng'], ['凱', 'Kai'],
  ['祐', 'Yu'], ['廷', 'Ting'], ['浩', 'Hao'], ['翔', 'Hsiang'], ['安', 'An'], ['仁', 'Jen'], ['昱', 'Yu'], ['維', 'Wei'], ['銘', 'Ming'], ['鴻', 'Hung'],
  ['傑', 'Chieh'], ['宏', 'Hung'], ['豪', 'Hao'], ['翰', 'Han'], ['恩', 'En'], ['軒', 'Hsuan'], ['鈞', 'Chun'], ['達', 'Ta'], ['毅', 'Yi'], ['威', 'Wei'],
  ['婷', 'Ting'], ['雅', 'Ya'], ['欣', 'Hsin'], ['怡', 'Yi'], ['筠', 'Yun'], ['萱', 'Hsuan']];
function genName() { const s = pick(SUR), a = pick(GIV), b = pick(GIV); return { zh: s[0] + a[0] + b[0], en: a[1] + '-' + b[1].toLowerCase() + ' ' + s[1] }; }

// ---------------- teams ----------------
const TEAMS = [
  { name: { zh: '雷霆', en: 'Thunder' }, main: '#2a5bd7', alt: '#f4c430', trim: '#ffffff' },
  { name: { zh: '火鳳', en: 'Phoenix' }, main: '#e0402e', alt: '#ffd25a', trim: '#5a1408' },
  { name: { zh: '飛龍', en: 'Dragons' }, main: '#1f9a52', alt: '#f2f2e6', trim: '#0e4a26' },
  { name: { zh: '猛虎', en: 'Tigers' }, main: '#f08a1c', alt: '#1c1c1c', trim: '#ffffff' },
  { name: { zh: '海鯨', en: 'Whales' }, main: '#1aa6c4', alt: '#0b2c4a', trim: '#ffffff' },
  { name: { zh: '紫晶', en: 'Amethyst' }, main: '#7a3fd0', alt: '#f0e4ff', trim: '#2c0f5a' },
  { name: { zh: '黑熊', en: 'Bears' }, main: '#2b2b30', alt: '#e0e0e0', trim: '#b02020' },
  { name: { zh: '金鷹', en: 'Eagles' }, main: '#c9a227', alt: '#3a2a10', trim: '#ffffff' },
  { name: { zh: '白鴿', en: 'Doves' }, main: '#eeeeea', alt: '#2a4ab0', trim: '#2a4ab0' }
];
const CITIES = [{ zh: '台北', en: 'Taipei' }, { zh: '新北', en: 'New Taipei' }, { zh: '桃園', en: 'Taoyuan' }, { zh: '新竹', en: 'Hsinchu' }, { zh: '台中', en: 'Taichung' },
  { zh: '台南', en: 'Tainan' }, { zh: '高雄', en: 'Kaohsiung' }, { zh: '花蓮', en: 'Hualien' }, { zh: '基隆', en: 'Keelung' }, { zh: '嘉義', en: 'Chiayi' }];
const PROFILE = {
  GK: { pac: -14, sho: -30, pas: -8, dri: -24, def: -10, phy: 4, gk: 18, hgt: 188 },
  DF: { pac: 0, sho: -14, pas: -2, dri: -8, def: 14, phy: 8, gk: -40, hgt: 184 },
  MF: { pac: 2, sho: 0, pas: 10, dri: 6, def: 2, phy: 0, gk: -40, hgt: 178 },
  FW: { pac: 8, sho: 14, pas: 0, dri: 8, def: -14, phy: 2, gk: -40, hgt: 180 }
};
let PID = 1;
const newStats = () => ({ G: 0, MIN: 0, GL: 0, A: 0, SH: 0, SOT: 0, PA: 0, PC: 0, TK: 0, SV: 0, FL: 0, YC: 0, RC: 0, OFF: 0 });
function genPlayer(pos, tier, fmt) {
  const pr = PROFILE[pos], r = {};
  RATINGS.forEach(k => { r[k] = Math.round(clamp(58 + tier + (pr[k] || 0) + gauss() * 9, 20, 95)); });
  if (pos === 'GK') r.gk = Math.round(clamp(66 + tier + (fmt.gk || 0) + gauss() * 8, 25, 95));
  else r.gk = Math.round(clamp(20 + gauss() * 6, 5, 40));
  r.sta = Math.round(clamp(70 + gauss() * 10, 40, 95));
  const kid = fmt.n < 11;
  return { id: PID++, name: genName(), num: 0, pos, hgt: Math.round((kid ? pr.hgt - 40 - (11 - fmt.n) * 4 : pr.hgt) + gauss() * 5), r, g: newStats(), s: newStats() };
}
function makeTeam(style, city, fmtKey) {
  const fmt = FORMATS[fmtKey], form = pick(fmt.forms), slots = parseForm(form);
  const t = Object.assign({}, style, { city, roster: [], W: 0, D: 0, L: 0, form, fmt: fmtKey, press: pick(['high', 'mid', 'low']) });
  slots.forEach(s => t.roster.push(genPlayer(s.pos, 0, fmt)));                    // starters, in formation order
  const benchPos = ['GK', 'DF', 'MF', 'FW', 'MF', 'DF', 'FW'];
  for (let i = 0; t.roster.length < fmt.roster; i++) t.roster.push(genPlayer(benchPos[i % benchPos.length], -6, fmt));
  const nums = []; for (let i = 1; i < 100; i++) nums.push(i);
  t.roster.forEach((p, i) => { p.num = i === 0 ? 1 : nums.splice(1 + Math.floor(R() * (nums.length - 1)), 1)[0]; p.team = t; });
  return t;
}

// ---------------- the four super players ----------------
const STARS = [{ zh: 'Josh Chen', en: 'Josh Chen' }, { zh: 'Jasper Chen', en: 'Jasper Chen' }, { zh: 'Jeff Chen', en: 'Jeff Chen' }, { zh: 'Erin Lai', en: 'Erin Lai' }];
function genStar(name, pos) {
  const r = {};
  RATINGS.forEach(k => { r[k] = Math.round(92 + R() * 7); });
  const pr = PROFILE[pos];
  ['def', 'sho', 'dri'].forEach(k => { r[k] = Math.round(clamp(r[k] + (pr[k] || 0) * 0.15, 88, 99)); });
  r.gk = pos === 'GK' ? Math.round(93 + R() * 6) : Math.round(30 + R() * 10);
  return { id: PID++, name: Object.assign({}, name), num: 0, pos, hgt: 0, r, g: newStats(), s: newStats(), star: true };
}
// every match puts them on random teams and random starting slots (a star might even end up in goal)
function addStars(teams) {
  const slots = [];
  teams.forEach((t, ti) => parseForm(t.form).forEach((s, pi) => slots.push({ ti, pi, w: s.pos === 'GK' ? 0.5 : 1 })));
  STARS.forEach(name => {
    if (teams.some(t => t.roster.some(p => p.star && p.name.en === name.en))) return;
    const free = slots.filter(s => !teams[s.ti].roster[s.pi].star);
    const s = pickW(free, x => x.w), t = teams[s.ti], old = t.roster[s.pi], star = genStar(name, old.pos);
    star.num = old.num; star.team = t; star.hgt = old.hgt + 4;
    t.roster[s.pi] = star;
  });
  return teams;
}
function makeMatch(fmtKey) {
  const styles = TEAMS.slice(), cities = CITIES.slice(), take = a => a.splice(Math.floor(R() * a.length), 1)[0];
  return addStars([makeTeam(take(styles), take(cities), fmtKey), makeTeam(take(styles), take(cities), fmtKey)]);
}
const ovr = p => p.pos === 'GK' ? Math.round((p.r.gk * 3 + p.r.phy + p.r.pas) / 5) :
  Math.round((p.r.pac + p.r.sho * (p.pos === 'FW' ? 1.6 : 0.8) + p.r.pas * (p.pos === 'MF' ? 1.5 : 1) + p.r.dri + p.r.def * (p.pos === 'DF' ? 1.8 : 0.6) + p.r.phy * 0.8) / (p.pos === 'FW' ? 6 : p.pos === 'DF' ? 6.2 : 6.1));

// ---------------- the tactics (names, descriptions) ----------------
const TACTICS = {
  build: { name: { zh: '短傳推進', en: 'Build-up Play' }, desc: { zh: '從後場用短傳一步步往前推，耐心等空檔。', en: 'Short passes from the back, moving up the pitch one step at a time.' } },
  tiki: { name: { zh: '傳控（Tiki-taka）', en: 'Tiki-taka' }, desc: { zh: '大量一腳短傳和跑位，用控球把防守拉開。', en: 'Quick one-touch passes and constant movement pull the defense apart.' } },
  wing: { name: { zh: '邊路傳中', en: 'Wing Play & Cross' }, desc: { zh: '把球轉到邊路，邊鋒下底後傳中給門前的隊友頭球攻門。', en: 'Get the ball wide, beat the full-back and cross for a header.' } },
  cutback: { name: { zh: '下底倒三角', en: 'Cut-back' }, desc: { zh: '衝到底線附近再把球往後回傳，給跟上的隊友射門（小朋友不頂頭球）。', en: 'Reach the byline and pull the ball back for a teammate arriving — no headers for young players.' } },
  overlap: { name: { zh: '套邊插上', en: 'Overlapping Run' }, desc: { zh: '邊後衛從邊鋒外側高速插上接球，邊路以二打一。', en: 'The full-back sprints around the outside of the winger to make a 2-on-1 down the flank.' } },
  through: { name: { zh: '直塞球', en: 'Through Ball' }, desc: { zh: '中場看準前鋒的啟動，把球塞進後衛身後，形成單刀。', en: 'A pass slipped between the defenders for the striker to run onto — one-on-one with the keeper.' } },
  onetwo: { name: { zh: '撞牆配合（二過一）', en: 'One-Two' }, desc: { zh: '傳給隊友後立刻前插，隊友一腳回傳，兩個人過掉一個人。', en: 'Pass, sprint past the defender and get it straight back: two beat one.' } },
  long: { name: { zh: '長傳衝吊', en: 'Long Ball' }, desc: { zh: '從後場直接長傳找前鋒，跳過中場爭頂。', en: 'Skip midfield with a long ball from the back for the striker to win.' } },
  counter: { name: { zh: '快速反擊', en: 'Counter-attack' }, desc: { zh: '搶斷後趁對手還沒回防，幾腳就殺到門前。', en: 'Win the ball and race forward before the opponents get back.' } },
  switch: { name: { zh: '轉移進攻', en: 'Switch of Play' }, desc: { zh: '先把防守吸到一邊，再一腳長傳轉到另一邊的空檔。', en: 'Draw the defense to one side, then switch the ball to the open far side.' } },
  dribble: { name: { zh: '個人突破', en: 'Solo Dribble' }, desc: { zh: '持球者靠盤帶連過數人，直接殺進禁區。', en: 'One player dribbles past defender after defender into the box.' } },
  buildout: { name: { zh: '建構線出球', en: 'Build-out Line' }, desc: { zh: '守門員拿球時，對手必須退到建構線後，讓我方從後場安全出球（兒童規則）。', en: 'When the keeper has the ball, opponents must retreat behind the build-out line so the team can play out from the back (youth rule).' } },
  corner: { name: { zh: '角球戰術', en: 'Corner Kick' }, desc: { zh: '把球開進禁區讓隊友搶點，或短開配合後射門。', en: 'Swing it into the box for a teammate to attack, or play it short.' } },
  freekick: { name: { zh: '定位球', en: 'Free Kick' }, desc: { zh: '在危險區域的自由球：直接射門或傳進禁區。', en: 'A free kick near goal: shoot directly or deliver into the box.' } },
  penalty: { name: { zh: '十二碼罰球', en: 'Penalty Kick' }, desc: { zh: '禁區內犯規！射手和守門員一對一。', en: 'A foul in the box: the shooter against the keeper.' } }
};

// how each tactic moves the ball: a list of [action, Δdepth, width, …] before the finish
const ROUTES = {
  build: [['pass', 0.12, 's'], ['pass', 0.1, 'x'], ['pass', 0.12, 's'], ['pass', 0.1, 'c']],
  tiki: [['pass', 0.06, 'x'], ['pass', 0.05, 'x'], ['pass', 0.07, 'x'], ['pass', 0.05, 'x'], ['pass', 0.07, 'x'], ['pass', 0.06, 'x'], ['pass', 0.06, 'c']],
  wing: [['pass', 0.12, 's'], ['pass', 0.12, 'w'], ['dribble', 0.14, 'w']],
  cutback: [['pass', 0.12, 's'], ['pass', 0.12, 'w'], ['dribble', 0.16, 'w']],
  overlap: [['pass', 0.12, 's'], ['pass', 0.12, 'w'], ['pass', 0.14, 'W', 'DF']],
  through: [['pass', 0.12, 'c'], ['pass', 0.1, 'c']],
  onetwo: [['pass', 0.12, 's'], ['pass', 0.12, 'c'], ['wall', 0.08, 'c']],
  long: [],
  counter: [['dribble', 0.14, 'c']],
  switch: [['pass', 0.1, 'w'], ['pass', 0.06, 'w'], ['switch', 0.04, 'F']],
  dribble: [['pass', 0.12, 'c'], ['dribble', 0.1, 'c'], ['dribble', 0.1, 'c']],
  buildout: [['pass', 0.1, 's', 'DF'], ['pass', 0.15, 's']]
};
// the finish of each tactic: the last ball and what kind of chance it makes
const FINISH = { build: 'edge', tiki: 'box', wing: 'cross', cutback: 'cutback', overlap: 'cross', through: 'through', onetwo: 'close', long: 'long', counter: 'through', switch: 'cross', dribble: 'close', buildout: 'edge' };
const XG = { box: 0.12, edge: 0.055, header: 0.1, cutback: 0.2, oneonone: 0.3, close: 0.22, freekick: 0.07, penalty: 0.78, corner: 0.075, long: 0.14, rebound: 0.3 };

// ---------------- the game ----------------
const SHOT_DUR = 1.0;
class Game {
  constructor(home, away, fmtKey) {
    this.fmt = FORMATS[fmtKey || home.fmt || '11v11']; this.fmtKey = fmtKey || home.fmt;
    this.teams = [home, away];
    this.ts = this.teams.map((t, i) => this.initTeam(t, i));
    this.period = 1; this.clock = 0; this.score = [0, 0]; this.over = false; this.log = [];
    this.line = [[], []];
    this.firstKick = R() < 0.5 ? 0 : 1; this.poss = this.firstKick;
    this.restart = { kind: 'kickoff', x: 0.5, y: 0 };
    this.added = this.stoppage();
  }
  initTeam(t, side) {
    const slots = parseForm(t.form);
    t.roster.forEach(p => { p.g = newStats(); p.e = 100; p.on = false; p.sentOff = false; p.yellow = 0; });
    const on = slots.map((s, i) => t.roster[i]);
    on.forEach((p, i) => { p.on = true; p.slot = i; p.starter = true; });
    t.roster.slice(on.length).forEach(p => { p.starter = false; p.slot = -1; });
    return { team: t, side, on, slots, subs: 0, st: { SH: 0, SOT: 0, CK: 0, FL: 0, OFF: 0, YC: 0, RC: 0, POS: 0, PA: 0, PC: 0, XG: 0 } };
  }
  stoppage() { return this.fmt.stoppage ? Math.round(60 + R() * 4 * 60) : 0; }
  // which way a team attacks: +1 toward x = L, −1 toward x = 0 (they switch at half time)
  dir(side) { const second = this.fmt.periods === 4 ? this.period >= 3 : this.period >= 2; return (side === 0 ? 1 : -1) * (second ? -1 : 1); }
  abs(side, depth, w) { const F = this.fmt; return [this.dir(side) > 0 ? depth * F.L : (1 - depth) * F.L, F.W / 2 + clamp(w, -1, 1) * F.W / 2 * 0.9]; }
  eff(p, k) { return p.r[k] * (0.82 + 0.18 * clamp(p.e, 0, 100) / 100); }
  // who on this team is around a spot (depth/width from their point of view)
  near(side, depth, w, opt) {
    const T = this.ts[side];
    const cands = T.on.filter(p => !p.sentOff && (!opt || !opt.not || !opt.not.includes(p)) && (!opt || !opt.pos || p.pos === opt.pos) && (p.pos !== 'GK' || (opt && opt.keeper)));
    if (!cands.length) return T.on.find(p => !p.sentOff);
    return pickW(cands, p => {
      const sp = slotSpot(T.slots[p.slot]), shift = (opt && opt.shift != null) ? opt.shift : 0.32;
      const d = (sp[0] + shift - depth), ww = (sp[1] - w) * 0.55;
      return Math.exp(-(d * d + ww * ww) / 0.025) * (opt && opt.rate ? Math.pow(p.r[opt.rate] / 70, 3) : 1) + 0.002;
    });
  }
  keeper(side) { return this.ts[side].on.find(p => p.pos === 'GK' && !p.sentOff) || this.ts[side].on[0]; }
  avg(side, k, pos) { const ps = this.ts[side].on.filter(p => !p.sentOff && (!pos || p.pos === pos)); return ps.length ? ps.reduce((s, p) => s + this.eff(p, k), 0) / ps.length : 50; }

  chooseTactic(off, rs) {
    const F = this.fmt, T = this.ts[off];
    if (rs.kind === 'corner') return 'corner';
    if (rs.kind === 'penalty') return 'penalty';
    if (rs.kind === 'freekick' && rs.x > 0.66) return 'freekick';
    if ((rs.kind === 'keeper' || rs.kind === 'goalkick') && F.buildOut && R() < 0.75) return 'buildout';
    if (rs.kind === 'turnover' && rs.x > 0.25 && rs.x < 0.65 && R() < 0.42) return 'counter';
    const pas = this.avg(off, 'pas'), dri = Math.max(...T.on.map(p => this.eff(p, 'dri'))), fwPac = this.avg(off, 'pac', 'FW');
    const small = F.n <= 7, wide = T.slots.filter(s => s.pos !== 'GK' && s.of >= 3).length > 0 || F.n >= 9;
    const w = {
      build: 3, tiki: Math.max(0.2, (pas - 58) / 6) * (small ? 0.5 : 1), wing: F.heading ? (wide ? 2.2 : 0.8) : 0, cutback: F.heading ? 0.8 : 2.2, overlap: F.n >= 9 ? 1.2 : 0.3,
      through: 1.2 + Math.max(0, fwPac - 65) / 15, onetwo: 1.2, long: (rs.x < 0.3 ? 1.2 : 0.3) * (F.n >= 9 ? 1 : 0.4), switch: F.n >= 9 ? 1 : 0.2,
      dribble: (small ? 2 : 0.8) + Math.max(0, dri - 85) / 4
    };
    return pickW(Object.keys(w), k => w[k]);
  }

  // ======================= one attack =======================
  step() {
    if (this.over) return null;
    const F = this.fmt, off = this.poss, def = 1 - off, O = this.ts[off], D = this.ts[def];
    const tl = [], ev = [], clock0 = this.clock, period = this.period, rs = this.restart;
    let t = { kickoff: 8, goalkick: 14, keeper: 6, throw: 9, corner: 22, freekick: 18, penalty: 45, turnover: 0, offside: 14 }[rs.kind] || 0;
    const say = (k, o) => ev.push(Object.assign({ k, side: off, t, clock: this.clock + t, period }, o));
    const tac = this.chooseTactic(off, rs);
    let depth = clamp(rs.x, 0.02, 0.98), w = rs.y || 0;
    let holder = rs.by && rs.by.on && !rs.by.sentOff ? rs.by : rs.kind === 'keeper' || rs.kind === 'goalkick' ? this.keeper(off) : this.near(off, depth, w, { keeper: depth < 0.08 });
    tl.push({ t: 0, k: 'phase', tac, kind: rs.kind, side: off, at: this.abs(off, depth, w) });
    tl.push({ t: 0, k: 'hold', p: holder.id, at: this.abs(off, depth, w) });
    if (!['corner', 'penalty', 'freekick'].includes(tac) || true) say('play', { tac });
    if (tac === 'buildout') say('buildout', {});
    let result = null, lastPasser = null, next = null;
    const pressure = (dd) => dd > 0.6 ? this.avg(def, 'def', 'DF') : this.avg(def, 'def', 'MF') || this.avg(def, 'def');
    const lose = (how, at, by) => {                         // the attack breaks down
      by = by || this.near(def, 1 - depth, -w, { rate: 'def' });
      if (how === 'out') { tl.push({ t, k: 'out', at }); say('out', { p: holder }); next = { side: def, kind: 'throw', x: 1 - depth, y: -w }; }
      else { by.g.TK++; tl.push({ t, k: how, p: holder.id, by: by.id, at }); say(how, { p: holder, by }); next = { side: def, kind: 'turnover', x: 1 - depth, y: -w, by }; }
      result = 'lost';
    };
    const foulCheck = (dribbling) => {
      if (R() > (dribbling ? 0.06 : 0.011)) return false;
      const by = this.near(def, 1 - depth, -w, { rate: 'phy' }), inBox = depth > 1 - F.box[0] / F.L && Math.abs(w) < F.box[1] / F.W;
      by.g.FL++; D.st.FL++;
      tl.push({ t, k: 'foul', p: by.id, on: holder.id, at: this.abs(off, depth, w) });
      say('foul', { p: by, on: holder });
      this.card(def, by, inBox ? 0.3 : depth > 0.7 ? 0.24 : 0.16, say, tl, t);
      next = inBox && R() < 0.85 ? { side: off, kind: 'penalty', x: 1 - F.spot / F.L, y: 0 } : { side: off, kind: 'freekick', x: depth, y: w, by: holder };
      if (next.kind === 'penalty') say('pen', { p: holder });
      result = 'foul';
      return true;
    };
    const pass = (to, kind, dd, ww, h) => {
      const at0 = this.abs(off, depth, w);
      const nd = clamp(depth + dd, 0.03, 0.97), nw = clamp(ww, -1, 1), at1 = this.abs(off, nd, nw);
      const dist = Math.hypot(at1[0] - at0[0], at1[1] - at0[1]);
      const dur = clamp(dist / (kind === 'long' || kind === 'switch' ? 22 : 15), 0.5, 2.6);
      const base = ({ short: 0.93, pass: 0.72, long: 0.5, switch: 0.68, through: 0.42, wall: 0.74, cross: 0.44 }[kind] || 0.75) - (F.n <= 7 ? 0.07 : F.n === 9 ? 0.035 : 0);
      const pr = clamp(base + (this.eff(holder, 'pas') - 62) * 0.004 + (this.eff(to, 'dri') - 62) * 0.0015 - (pressure(nd) - 62) * 0.003, 0.3, 0.97);
      holder.g.PA++; O.st.PA++;
      tl.push({ t, k: 'pass', from: holder.id, to: to.id, at0, at1, dur, h: h || 0, kind });
      t += dur;
      if (R() > pr) { depth = nd; w = nw; t += 0.2; lose(R() < 0.25 ? 'out' : 'intercept', at1); return false; }
      holder.g.PC++; O.st.PC++;
      lastPasser = holder; holder = to; depth = nd; w = nw;
      tl.push({ t, k: 'hold', p: holder.id, at: at1 });
      t += kind === 'short' ? 1.5 + R() * 2 : 0.8 + R() * 1.2;
      return true;
    };
    const dribble = (dd, ww) => {
      const at0 = this.abs(off, depth, w), nd = clamp(depth + dd, 0.03, 0.97), nw = clamp(ww, -1, 1), at1 = this.abs(off, nd, nw);
      const dur = clamp(Math.hypot(at1[0] - at0[0], at1[1] - at0[1]) / (5 + this.eff(holder, 'pac') / 25), 0.8, 4);
      tl.push({ t, k: 'dribble', p: holder.id, at0, at1, dur });
      const pr = clamp(0.55 + (this.eff(holder, 'dri') - pressure(nd)) * 0.007, 0.25, 0.9);
      t += dur;
      depth = nd; w = nw;
      if (foulCheck(true)) return false;
      if (R() > pr) { lose('tackle', at1); return false; }
      lastPasser = null;
      return true;
    };
    const widthFor = (code) => code === 's' ? (w + (R() - 0.5) * 0.8) : code === 'x' ? (R() - 0.5) * 1.6 : code === 'c' ? (R() - 0.5) * 0.5 : code === 'w' ? (w >= 0 ? 0.85 : -0.85) : code === 'W' ? (w >= 0 ? 0.95 : -0.95) : code === 'F' ? (w >= 0 ? -0.85 : 0.85) : w;

    // ---- set pieces ----
    if (tac === 'penalty') {
      const shooter = pickW(O.on.filter(p => !p.sentOff && p.pos !== 'GK'), p => Math.pow(this.eff(p, 'sho'), 3) * (p.star ? 3 : 1));
      holder = shooter; depth = 1 - F.spot / F.L; w = 0;
      tl.push({ t, k: 'hold', p: holder.id, at: this.abs(off, depth, w) });
      t += 2;
      this.shoot(off, shooter, null, 'penalty', depth, w, tl, ev, say, () => t, v => { t = v; }, r => { next = r; });
      return this.finish(off, tac, tl, ev, t, clock0, period, next);
    }
    if (tac === 'corner' || tac === 'freekick') {
      const taker = pickW(O.on.filter(p => !p.sentOff && p.pos !== 'GK'), p => Math.pow(this.eff(p, 'pas'), 3));
      holder = taker;
      if (tac === 'corner') { depth = 0.995; w = rs.y >= 0 ? 0.99 : -0.99; }
      tl.push({ t, k: 'hold', p: holder.id, at: this.abs(off, depth, w) });
      const direct = tac === 'freekick' && depth > 0.72 && Math.abs(w) < 0.5 && R() < 0.55;
      if (direct) { this.shoot(off, holder, null, 'freekick', depth, w, tl, ev, say, () => t, v => { t = v; }, r => { next = r; }); return this.finish(off, tac, tl, ev, t, clock0, period, next); }
      const aerial = F.heading && R() < 0.75;
      const target = aerial ? pickW(O.on.filter(p => !p.sentOff && p.pos !== 'GK' && p !== holder), p => Math.pow(this.eff(p, 'phy') + (p.hgt - 170) * 0.5, 2)) : this.near(off, 0.88, 0, { not: [holder] });
      const td = aerial ? 1 - (3 + R() * 6) / F.L : 1 - (F.box[0] + 2) / F.L, tw = (R() - 0.5) * (aerial ? 0.35 : 0.5);
      if (!pass(target, aerial ? 'cross' : 'pass', td - depth, tw, aerial ? 4 : 0)) return this.finish(off, tac, tl, ev, t, clock0, period, next);
      this.shoot(off, holder, lastPasser, aerial ? 'corner' : 'edge', depth, w, tl, ev, say, () => t, v => { t = v; }, r => { next = r; }, aerial);
      return this.finish(off, tac, tl, ev, t, clock0, period, next);
    }

    // ---- open play: the tactic's route, then its finish ----
    if (tac === 'counter') t = Math.max(0, t - 1);
    // keep the ball first: safe passes across the back and midfield before the tactic starts
    if (tac !== 'counter') {
      const recycle = { tiki: 6, build: 4, buildout: 2, wing: 3, cutback: 2, overlap: 3, switch: 3, onetwo: 2, through: 2, long: 0, dribble: 1 }[tac] || 1;
      const n = Math.max(0, Math.round(recycle * (F.n >= 11 ? 1.3 : F.n >= 9 ? 1 : 0.55) + (F.n >= 11 ? 1 : 0) + gauss() * 1.3));
      for (let i = 0; i < n && !result; i++) {
        if (foulCheck(false)) break;
        const nw = (R() - 0.5) * 1.6, dd = (R() - 0.5) * 0.08;
        const to = this.near(off, clamp(depth + dd, 0.05, 0.95), nw, { not: [holder] });
        if (!pass(to, 'short', dd, nw)) break;
      }
    }
    for (const st of ROUTES[tac]) {
      if (depth > 0.8) break;
      if (foulCheck(false)) break;
      const [act, dd, code, role] = st, nw = widthFor(code);
      if (act === 'dribble') { if (!dribble(dd, nw)) break; continue; }
      const to = this.near(off, clamp(depth + dd, 0, 1), nw, { not: [holder], pos: role, shift: role === 'DF' ? 0.55 : 0.32 });
      if (!pass(to, act === 'switch' ? 'switch' : act === 'wall' ? 'wall' : 'pass', dd, nw, act === 'switch' ? 2.5 : 0)) break;
    }
    if (!result) {
      const fin = FINISH[tac];
      const offside = (target) => {
        if (F.offside === 'none') return false;
        if (F.offside === 'buildout' && target < 1 - F.buildOut / F.L) return false;
        return R() < 0.12;
      };
      if (fin === 'through' || fin === 'long') {
        const kind = fin === 'long' ? 'long' : 'through', runner = this.near(off, 0.85, (R() - 0.5) * 0.4, { not: [holder], pos: 'FW' }) || this.near(off, 0.85, 0, { not: [holder] });
        const td = clamp(0.84 + R() * 0.06 - depth, 0.05, 0.8), tw = (R() - 0.5) * 0.4;
        tl.push({ t: Math.max(0, t - 1), k: 'run', p: runner.id, at0: this.abs(off, depth + td - 0.12, tw), at1: this.abs(off, depth + td, tw), dur: 1.2 });
        if (offside(depth + td)) {
          holder.g.PA++; O.st.PA++;
          tl.push({ t, k: 'pass', from: holder.id, to: runner.id, at0: this.abs(off, depth, w), at1: this.abs(off, depth + td, tw), dur: 1.4, h: kind === 'long' ? 4 : 0, kind });
          t += 1.4; runner.g.OFF++; O.st.OFF++;
          tl.push({ t, k: 'offside', p: runner.id, at: this.abs(off, depth + td, tw) });
          say('offside', { p: runner });
          next = { side: def, kind: 'offside', x: 1 - (depth + td), y: -tw };
          result = 'offside';
        } else if (pass(runner, kind, td, tw, kind === 'long' ? 4 : 0)) {
          if (kind === 'long' && R() > clamp(0.5 + (this.eff(holder, 'phy') - this.avg(def, 'phy', 'DF')) * 0.01, 0.25, 0.85)) lose('intercept', this.abs(off, depth, w));
          else this.shoot(off, holder, lastPasser, kind === 'long' ? 'long' : 'oneonone', depth, w, tl, ev, say, () => t, v => { t = v; }, r => { next = r; });
        }
      } else if (fin === 'cross' || fin === 'cutback') {
        if (depth < 0.78) dribble(0.85 - depth, w >= 0 ? 0.88 : -0.88);
        if (!result) {
          const header = fin === 'cross' && F.heading;
          const target = header ? pickW(O.on.filter(p => !p.sentOff && p.pos !== 'GK' && p !== holder), p => Math.pow(this.eff(p, 'phy') + (p.pos === 'FW' ? 20 : 0), 2)) : this.near(off, 0.85, 0, { not: [holder] });
          const td = header ? 1 - (5 + R() * 6) / F.L : 1 - (F.box[0] - 2 + R() * 4) / F.L, tw = (R() - 0.5) * 0.3;
          if (pass(target, header ? 'cross' : 'pass', td - depth, tw, header ? 3.5 : 0)) this.shoot(off, holder, lastPasser, header ? 'header' : 'cutback', depth, w, tl, ev, say, () => t, v => { t = v; }, r => { next = r; }, header);
        }
      } else {
        if (fin === 'close' && depth < 0.84) dribble(0.88 - depth, w * 0.5);
        if (!result) {
          if (fin === 'edge' && depth < 0.7) dribble(0.74 - depth, w * 0.6);
          if (!result) this.shoot(off, holder, lastPasser, fin === 'edge' ? 'edge' : fin, depth, w, tl, ev, say, () => t, v => { t = v; }, r => { next = r; });
        }
      }
    }
    return this.finish(off, tac, tl, ev, t, clock0, period, next);
  }
  card(side, p, chance, say, tl, t) {
    if (!this.fmt.cards || R() > chance * (this.fmt.n < 11 ? 0.5 : 1)) return;
    p.yellow++; p.g.YC++; this.ts[side].st.YC++;
    const red = p.yellow >= 2;
    tl.push({ t, k: 'card', p: p.id, color: red ? 'red' : 'yellow' });
    say(red ? 'red' : 'yellow', { p, side });
    if (red) { p.sentOff = true; p.g.RC++; this.ts[side].st.RC++; }
  }
  // a shot: blocked, saved, wide, or in
  shoot(off, shooter, assist, type, depth, w, tl, ev, say, getT, setT, setNext, header) {
    const F = this.fmt, def = 1 - off, O = this.ts[off], gk = this.keeper(def), at0 = this.abs(off, depth, w);
    let t = getT();
    const clearP = { edge: 0.3, box: 0.4, header: 0.42, cutback: 0.42, oneonone: 0.3, close: 0.4, long: 0.4, corner: 0.5 }[type] || 0;
    if (R() < clamp(clearP + (F.n >= 11 ? 0.06 : 0) + (this.avg(def, 'def', 'DF') - 62) * 0.004, 0, 0.75)) {        // the defense clears it before the shot
      const by = this.near(def, 1 - depth, -w, { rate: 'def' });
      by.g.TK++;
      tl.push({ t, k: 'clear', p: shooter.id, by: by.id, at: at0 });
      say('clear', { p: shooter, by });
      if (R() < 0.3) { O.st.CK++; say('corner', {}); setNext({ side: off, kind: 'corner', x: 0.99, y: w >= 0 ? 1 : -1 }); }
      else setNext({ side: def, kind: 'turnover', x: 1 - depth + 0.08, y: -w, by });
      setT(t + 1);
      return;
    }
    const gx = this.dir(off) > 0 ? F.L : 0;
    const sh = header ? this.eff(shooter, 'phy') * 0.5 + this.eff(shooter, 'sho') * 0.5 : this.eff(shooter, 'sho');
    let xg = XG[type] * (0.55 + (sh - 40) / 60 * 0.8) * (1.35 - this.eff(gk, 'gk') / 100 * 0.6);
    if (type === 'penalty') xg = clamp(0.62 + (sh - this.eff(gk, 'gk')) * 0.004, 0.55, 0.92);
    if (F.n >= 11 && type !== 'penalty') xg *= 0.8;            // grown-up keepers and defenders
    xg = clamp(xg, 0.01, 0.9);
    shooter.g.SH++; O.st.SH++; O.st.XG += xg;
    const blockP = type === 'edge' ? 0.22 : type === 'penalty' || type === 'freekick' ? 0 : 0.1;
    const roll = R();
    let res;
    if (roll < blockP) res = 'block';
    else if (R() < xg) res = 'goal';
    else res = R() < 0.31 ? 'save' : R() < 0.12 ? 'post' : 'wide';
    const ty = F.W / 2 + (R() - 0.5) * F.goalW * (res === 'wide' ? 1.8 : 0.85), tz = res === 'wide' && R() < 0.5 ? F.goalH * (1.1 + R() * 0.6) : R() * F.goalH * 0.9;
    const dur = type === 'header' ? 0.6 : type === 'penalty' ? 0.5 : SHOT_DUR;
    tl.push({ t, k: 'shot', p: shooter.id, at0, at1: res === 'block' ? [at0[0] + (gx - at0[0]) * 0.15, at0[1]] : [gx, ty], z: res === 'block' ? 0.5 : tz, dur, res, type, gk: gk.id });
    t += dur;
    if (res !== 'block' && res !== 'wide') { shooter.g.SOT++; O.st.SOT++; }
    if (res === 'goal') {
      shooter.g.GL++; this.score[off]++;
      if (assist && assist !== shooter) assist.g.A++;
      tl.push({ t, k: 'goal', p: shooter.id, side: off });
      say('goal', { p: shooter, ast: assist && assist !== shooter ? assist : null, type });
      this.line[off][this.period - 1] = (this.line[off][this.period - 1] || 0) + 1;
      setT(t + 6); setNext({ side: def, kind: 'kickoff', x: 0.5, y: 0 });
      return;
    }
    if (res === 'save') {
      gk.g.SV++;
      tl.push({ t, k: 'save', p: gk.id, at: [gx, ty] });
      say('save', { p: shooter, by: gk, type });
      const r = R();
      if (r < 0.28) { O.st.CK++; say('corner', {}); setNext({ side: off, kind: 'corner', x: 0.99, y: ty > F.W / 2 ? 1 : -1 }); }
      else setNext({ side: def, kind: 'keeper', x: 0.04, y: 0, by: gk });
    } else if (res === 'block') {
      tl.push({ t, k: 'block', p: shooter.id });
      say('blocked', { p: shooter });
      if (R() < 0.45) { O.st.CK++; say('corner', {}); setNext({ side: off, kind: 'corner', x: 0.99, y: w >= 0 ? 1 : -1 }); }
      else setNext({ side: def, kind: 'turnover', x: 1 - depth + 0.05, y: -w });
    } else {
      say(res === 'post' ? 'post' : 'wide', { p: shooter, type });
      setNext({ side: def, kind: 'goalkick', x: 0.05, y: 0 });
    }
    setT(t + 0.5);
  }
  finish(off, tac, tl, ev, t, clock0, period, next) {
    const F = this.fmt;
    t = Math.max(t, 3);
    tl.push({ t, k: 'end' });
    this.ts[off].st.POS += t;
    this.tire(t);
    this.clock += t;
    // substitutions at quarter breaks, and every few minutes in youth soccer so everyone plays
    const evAfter = [];
    this.minutes(t);
    if (next) { this.poss = next.side; this.restart = next; }
    else { this.poss = 1 - off; this.restart = { kind: 'turnover', x: 0.3, y: 0 }; }
    // end of a period
    if (this.clock >= F.len + this.added) {
      evAfter.push({ k: 'periodEnd', period: this.period, score: this.score.slice() });
      if (this.period >= F.periods) this.finishMatch(evAfter);
      else {
        this.period++; this.clock = 0; this.added = this.stoppage();
        this.poss = this.period % 2 === 0 ? 1 - this.firstKick : this.firstKick;
        this.restart = { kind: 'kickoff', x: 0.5, y: 0 };
        this.subs(0, evAfter, true); this.subs(1, evAfter, true);
      }
    } else if (!next || next.kind !== 'turnover') { this.subs(0, evAfter, false); this.subs(1, evAfter, false); }
    evAfter.forEach(e => { e.clock = this.clock; ev.push(e); });
    ev.forEach(e => this.log.push(e));
    return { log: ev, tl, dur: t, clock0, period, off, tac };
  }
  tire(t) {
    const F = this.fmt;
    this.ts.forEach(T => {
      T.on.forEach(p => { if (!p.sentOff) p.e = Math.max(15, p.e - t / 60 * (p.pos === 'GK' ? 0.15 : 0.95) * (1.4 - p.r.sta / 100) * (F.n < 11 ? 1.6 : 1)); });
      T.team.roster.forEach(p => { if (!p.on) p.e = Math.min(100, p.e + t / 60 * 2.5); });
    });
  }
  minutes(t) { this.ts.forEach(T => T.on.forEach(p => { if (!p.sentOff) p.g.MIN += t / 60; })); }
  // 11v11: up to five changes for tired players after an hour · youth: rolling changes so playing time is shared
  subs(side, ev, breakTime) {
    const T = this.ts[side], F = this.fmt, bench = T.team.roster.filter(p => !p.on && !p.sentOff && !p.g.RC);
    if (!bench.length) return;
    const minute = (this.period - 1) * F.len / 60 + this.clock / 60;
    let out = [];
    if (F.subs === 'rolling') {
      if (!breakTime && R() > 0.08) return;
      const field = T.on.filter(p => !p.sentOff && p.pos !== 'GK').sort((a, b) => (b.g.MIN - a.g.MIN) || (a.e - b.e));
      out = field.slice(0, Math.min(bench.length, breakTime ? 2 : 1));
    } else {
      if (T.subs >= F.subs || minute < 55 || R() > 0.12) return;
      out = T.on.filter(p => !p.sentOff && p.pos !== 'GK' && p.e < 62).sort((a, b) => a.e - b.e).slice(0, 1);
    }
    out.forEach(p => {
      const pool = bench.filter(b => !b.on && b.pos !== 'GK');
      if (!pool.length) return;
      const inn = pool.sort((a, b) => (a.pos === p.pos ? -1 : 0) - (b.pos === p.pos ? -1 : 0) || (a.g.MIN - b.g.MIN) || (ovr(b) - ovr(a)))[0];
      const i = T.on.indexOf(p);
      p.on = false; inn.on = true; inn.slot = p.slot; T.on[i] = inn; T.subs++;
      ev.push({ k: 'sub', side, inn, out: p });
    });
  }
  finishMatch(ev) {
    this.over = true;
    const w = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    if (w < 0) { this.teams[0].D++; this.teams[1].D++; } else { this.teams[w].W++; this.teams[1 - w].L++; }
    this.teams.forEach(t => t.roster.forEach(p => { if (p.g.MIN > 0) { p.s.G++; Object.keys(p.g).forEach(k => { if (k !== 'G') p.s[k] += p.g[k]; }); } }));
    ev.push({ k: 'final', score: this.score.slice(), winner: w });
  }
}

const api = { FORMATS, TACTICS, ROUTES, POS, POS_NAME, RATINGS, Game, makeMatch, makeTeam, addStars, parseForm, slotSpot, newStats, ovr, setRandom, STARS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.SOCCER = api;
})(typeof window !== 'undefined' ? window : globalThis);
