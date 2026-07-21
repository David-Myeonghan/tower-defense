import { CONFIG } from './config.js';
import { buildWaypoints, expandPathCells } from './grid.js';
import { spawnEnemy, stepEnemy } from './enemy.js';
import { tickCooldowns, stepCombat } from './combat.js';
import { wavePlan, enemyKindAt } from './wave.js';
import { killReward } from './economy.js';

export function freshState() {
  const state = {
    status: 'playing',
    timeSec: 0,
    lives: CONFIG.lives.start,
    gold: CONFIG.economy.startGold,
    wave: 1,
    score: 0,
    kills: 0,
    waypoints: buildWaypoints(),
    pathSet: expandPathCells(),
    enemies: [],
    towers: [],
    spawn: { remaining: 0, timer: 0, index: 0 },
    betweenTimer: 0,
    nextId: 1,
    best: { wave: 1, score: 0 },
  };
  return startWave(state, 1);
}

export function startWave(state, wave) {
  const plan = wavePlan(wave);
  return { ...state, wave, spawn: { remaining: plan.count, timer: 0, index: 0 } };
}

// 한 틱 진행 (고정 dt). 불변 지향이나 성능 위해 새 배열 재할당.
export function tick(state, dt) {
  if (state.status !== 'playing') return state;

  let s = { ...state, timeSec: state.timeSec + dt };

  // 1) 스폰
  const plan = wavePlan(s.wave);
  let { remaining, timer, index } = s.spawn;
  const enemies = [...s.enemies];
  timer -= dt;
  while (remaining > 0 && timer <= 0) {
    enemies.push(spawnEnemy(enemyKindAt(s.wave, index), s.wave, s.waypoints, s.nextId));
    s = { ...s, nextId: s.nextId + 1 };
    remaining--; index++;
    timer += plan.interval;
  }
  s = { ...s, spawn: { remaining, timer, index }, enemies };

  // 2) 이동 + 출구 도달
  let lives = s.lives;
  const moved = [];
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const r = stepEnemy(e, dt, s.waypoints, s.timeSec);
    if (r.reachedExit) lives--;
    else moved.push(r.enemy);
  }
  s = { ...s, enemies: moved, lives };

  // 3) 전투 (쿨다운 → 발사)
  const cooled = tickCooldowns(s.towers, dt);
  const combat = stepCombat({ ...s, towers: cooled });
  let gold = s.gold;
  let kills = s.kills;
  const killedSet = new Set(combat.killedIds);
  for (const e of combat.enemies) {
    if (killedSet.has(e.id)) { gold += killReward(e.kind, s.wave); kills++; }
  }
  s = { ...s, towers: combat.towers, enemies: combat.enemies.filter((e) => e.alive), gold, kills, score: kills };

  // 4) 웨이브 클리어 → 보너스 + 다음 웨이브
  if (s.spawn.remaining === 0 && s.enemies.length === 0) {
    s = { ...s, gold: s.gold + plan.bonus };
    s = startWave(s, s.wave + 1);
  }

  // 5) 게임오버
  if (s.lives <= 0) {
    s = {
      ...s,
      status: 'over',
      best: {
        wave: Math.max(s.best.wave, s.wave),
        score: Math.max(s.best.score, s.score),
      },
    };
  }

  return s;
}
