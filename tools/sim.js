// Plays many matches in every format and prints average team stats (compare with real soccer in brackets).
//   node tools/sim.js [matches per format]
'use strict';
const S = require('../engine.js');
const N = +(process.argv[2] || 200);
const REAL = { '11v11': 'pro: 1.4 goals, 12.5 shots, 4.5 on target, 5 corners, 11 fouls, 2 yellows, 2 offsides per team' };
let bad = 0;
for (const fmt of Object.keys(S.FORMATS)) {
  const st = { goals: [], SH: 0, SOT: 0, CK: 0, FL: 0, YC: 0, RC: 0, OFF: 0, PA: 0, PC: 0, XG: 0, phases: 0, draws: 0, starGoals: 0, starMatches: 0, minutesSpread: 0, tac: {} };
  for (let m = 0; m < N; m++) {
    const teams = S.makeMatch(fmt), g = new S.Game(teams[0], teams[1], fmt);
    let r, guard = 0;
    while ((r = g.step()) && guard++ < 5000) {
      st.phases++; st.tac[r.tac] = (st.tac[r.tac] || 0) + 1;
      r.tl.forEach(e => { ['at', 'at0', 'at1'].forEach(k => { if (e[k] && !(Number.isFinite(e[k][0]) && Number.isFinite(e[k][1]))) { bad++; if (bad < 6) console.log(fmt, 'bad point', JSON.stringify(e)); } }); });
      if (!Number.isFinite(r.dur) || r.dur <= 0) { bad++; console.log(fmt, 'bad duration', r.dur); }
    }
    if (!g.over) { bad++; console.log(fmt, 'match did not finish'); continue; }
    st.goals.push(g.score[0], g.score[1]); if (g.score[0] === g.score[1]) st.draws++;
    g.ts.forEach(T => Object.keys(T.st).forEach(k => { if (st[k] != null) st[k] += T.st[k]; }));
    teams.forEach(t => t.roster.forEach(p => { if (p.star) { st.starGoals += p.g.GL; st.starMatches++; } }));
    // playing time: in youth soccer everyone should get minutes
    const t0 = teams[0].roster.map(p => p.g.MIN), total = (g.fmt.len * g.fmt.periods) / 60;
    st.minutesSpread += t0.filter(x => x < total * 0.25).length;
  }
  const T = N * 2, avg = (k) => (st[k] / T).toFixed(1), G = st.goals.reduce((a, b) => a + b, 0) / T;
  console.log(`${fmt.padEnd(6)} goals ${G.toFixed(2)} (xG ${avg('XG')}) · shots ${avg('SH')} on target ${avg('SOT')} · corners ${avg('CK')} · fouls ${avg('FL')} · yellow ${avg('YC')} red ${(st.RC / T).toFixed(2)} · offside ${avg('OFF')}` +
    ` · passes ${avg('PA')} (${(st.PC / st.PA * 100).toFixed(0)}%) · draws ${(st.draws / N * 100).toFixed(0)}% · attacks/match ${(st.phases / N).toFixed(0)} · star goals/match ${(st.starGoals / st.starMatches).toFixed(2)} · kids under 25% time ${(st.minutesSpread / N).toFixed(1)}`);
  console.log('        tactics ' + Object.entries(st.tac).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (v / st.phases * 100).toFixed(0) + '%').join(', '));
  if (REAL[fmt]) console.log('        [' + REAL[fmt] + ']');
}
console.log(bad ? bad + ' PROBLEM(S)' : 'all matches finished cleanly');
process.exit(bad ? 1 : 0);
