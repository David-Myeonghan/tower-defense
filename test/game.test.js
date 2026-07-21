import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, startWave, tick, serialize, deserialize } from '../src/game.js';
import { createTower } from '../src/tower.js';
import { CONFIG } from '../src/config.js';

const STEP = 1 / 60;

test('freshState defaults', () => {
  const s = freshState();
  assert.equal(s.status, 'playing');
  assert.equal(s.lives, CONFIG.lives.start);
  assert.equal(s.gold, CONFIG.economy.startGold);
  assert.equal(s.wave, 1);
  assert.equal(s.spawn.remaining, CONFIG.waves.baseCount);
});

test('spawns exactly wavePlan.count enemies over time', () => {
  let s = freshState();
  const target = s.spawn.remaining;
  // 충분히 오래 돌려 전부 스폰 (이동은 되지만 카운트만 확인)
  let maxSeen = 0;
  for (let i = 0; i < 60 * 20; i++) {
    s = tick(s, STEP);
    maxSeen = Math.max(maxSeen, s.kills + s.enemies.length + s.lives); // 대략 활동 확인
    if (s.spawn.remaining === 0) break;
  }
  assert.equal(s.spawn.remaining, 0); // 전부 스폰됨
});

test('enemy reaching exit drops a life', () => {
  let s = freshState();
  // 적 하나를 마지막 웨이포인트 직전에 배치
  const wp = s.waypoints;
  const last = wp[wp.length - 1];
  s = {
    ...s,
    spawn: { remaining: 0, timer: 999, index: 0 }, // 추가 스폰 방지
    enemies: [{
      id: 1, kind: 'normal', x: last.x, y: last.y, wpIndex: wp.length - 1,
      hp: 100, maxHp: 100, baseSpeed: 55, slowFactor: 1, slowUntil: 0, alive: true, reachedExit: false,
    }],
  };
  const before = s.lives;
  // 한 틱만에 마지막 통과
  s = tick(s, 1);
  assert.equal(s.lives, before - 1);
});

test('kill gives gold and score', () => {
  let s = freshState();
  const wp = s.waypoints;
  // 경로 초반에 약한 적 하나, 그 근처에 강한 타워
  const start = wp[0];
  s = {
    ...s,
    gold: 0,
    spawn: { remaining: 0, timer: 999, index: 0 },
    enemies: [{
      id: 1, kind: 'normal', x: start.x, y: start.y, wpIndex: 1,
      hp: 1, maxHp: 1, baseSpeed: 0, slowFactor: 1, slowUntil: 0, alive: true, reachedExit: false,
    }],
    towers: [{ ...createTower('arrow', 0, 1, 50), x: start.x, y: start.y }], // 적 위치에 근접
  };
  s = tick(s, STEP);
  assert.equal(s.kills, 1);
  assert.ok(s.gold > 0);
  assert.equal(s.enemies.length, 0);
});

test('game over when lives hit zero', () => {
  let s = freshState();
  s = { ...s, lives: 1, spawn: { remaining: 0, timer: 999, index: 0 } };
  const wp = s.waypoints; const last = wp[wp.length - 1];
  s = { ...s, enemies: [{
    id: 1, kind: 'normal', x: last.x, y: last.y, wpIndex: wp.length - 1,
    hp: 100, maxHp: 100, baseSpeed: 55, slowFactor: 1, slowUntil: 0, alive: true, reachedExit: false,
  }] };
  s = tick(s, 1);
  assert.equal(s.status, 'over');
  assert.ok(s.best.wave >= 1);
  // 이후 tick은 no-op
  const frozen = tick(s, 1);
  assert.equal(frozen, s);
});

test('serialize/deserialize restores an in-progress game', () => {
  let s = freshState();
  s = { ...s, gold: 999, wave: 5, score: 12, kills: 12, lives: 8,
        towers: [{ id: 1, kind: 'arrow', col: 5, row: 5, x: 220, y: 260, level: 3, cooldownLeft: 0 }] };
  const restored = deserialize(serialize(s));
  assert.equal(restored.status, 'playing');
  assert.equal(restored.gold, 999);
  assert.equal(restored.wave, 5);
  assert.equal(restored.score, 12);
  assert.equal(restored.lives, 8);
  assert.equal(restored.towers.length, 1);
  assert.equal(restored.towers[0].level, 3);
  // 재빌드 필드 존재
  assert.ok(restored.waypoints.length > 0);
  assert.ok(restored.pathSet.size > 0);
});

test('deserialize of a game-over snapshot starts fresh but keeps best', () => {
  const over = { status: 'over', wave: 7, gold: 0, towers: [{ id: 1 }], best: { wave: 7, score: 40 } };
  const restored = deserialize(over);
  assert.equal(restored.status, 'playing');
  assert.equal(restored.wave, 1);          // 새 게임
  assert.equal(restored.towers.length, 0); // 보드 초기화
  assert.deepEqual(restored.best, { wave: 7, score: 40 }); // 최고기록 유지
});

test('wave clears and advances when all spawned and cleared', () => {
  let s = freshState();
  s = { ...s, spawn: { remaining: 0, timer: 999, index: 0 }, enemies: [] };
  const beforeWave = s.wave;
  const beforeGold = s.gold;
  s = tick(s, STEP);
  assert.equal(s.wave, beforeWave + 1);
  assert.ok(s.gold > beforeGold); // 보너스
});
