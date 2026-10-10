# 像素足球 Pixel Soccer

**Play:** https://ywchen0711.github.io/pixel-soccer/

An automatic pixel soccer simulation in the style of [Pixel Hoops](https://ywchen0711.github.io/pixel-hoops/): every player has
ratings, the match is simulated attack by attack, and it plays out on an HD-2D pixel pitch with big-headed chibi players.

- **Formats** — the full game and the small-sided youth formats, each with its own rules:
  - **11v11** (U13+): two 45-minute halves plus stoppage time, offside, headers, yellow and red cards, five substitutions, night stadium
  - **9v9** (U11–U12): two 30-minute halves, build-out line, offside, rolling substitutions, school field with bleachers
  - **7v7** (U9–U10): two 25-minute halves, build-out line, offside only beyond the build-out line, no heading
  - **6v6** (U8–U9) and **5v5** (U6–U8): four quarters, small goals, no offside, no heading, everybody plays — at the park
- **Tactics** — every attack runs a named tactic chosen for the situation and the team: build-up play, tiki-taka,
  wing play and crosses (cut-backs for young players who don't head the ball), overlapping runs, through balls,
  one-twos, long balls, counter-attacks, switches of play, solo dribbles, the build-out line, corners, free kicks and
  penalties. The tactic shows on the pitch and is drawn live on the playbook (passes, dribbles, runs and the shot),
  together with each team's formation (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 3-2-3, 2-3-1, 2-2-1…) and pressing style
- **The four super players** — Josh Chen, Jasper Chen, Jeff Chen and Erin Lai play in every match (all formats),
  on random teams and in random positions — sometimes in goal — with ratings around 92–99 (marked ★)
- Ratings: pace, shooting, passing, dribbling, defending, physical, goalkeeping and stamina; players tire
- Scoreboard with possession, shots, shots on target, corners and fouls; play-by-play; box score (goals, assists,
  shots, passes, tackles, saves, cards, match rating, xG); rosters; the rules of each format; speed 2x–60x or sim to the end
- Records and season stats carry over between matches (saved in your browser); Chinese and English

## Balance

`node tools/sim.js 200` plays 200 matches in every format and compares the 11v11 numbers with professional soccer —
about 1.5 goals, 14 shots, 5–6 on target, 5 corners, 11 fouls, 2 yellow cards and 2 offsides per team, ~22% draws.

## Files

```
engine.js      formats, players, tactics and the match simulation — runs in Node too
game.js        the pitch animation, scoreboard, playbook, play-by-play, box score, rosters, rules
tools/sim.js   league averages for every format
```
