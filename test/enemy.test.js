import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnEnemy, effectiveSpeed, applySlow, stepEnemy } from '../src/enemy.js';

// 수평 웨이포인트: (0,0)->(100,0)->(200,0)
const WP = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];

test('spawnEnemy at first waypoint heading to second', () => {
  const e = spawnEnemy('normal', 1, WP, 1);
  assert.equal(e.x, 0); assert.equal(e.y, 0);
  assert.equal(e.wpIndex, 1);
  assert.equal(e.hp, 12); assert.equal(e.maxHp, 12);
  assert.equal(e.alive, true);
});

test('stepEnemy moves speed*dt toward next waypoint', () => {
  const e = spawnEnemy('normal', 1, WP, 1); // speed 55
  const { enemy } = stepEnemy(e, 1, WP, 0); // dt=1 → 55px
  assert.ok(Math.abs(enemy.x - 55) < 1e-9);
  assert.equal(enemy.y, 0);
  assert.equal(enemy.wpIndex, 1);
});

test('deterministic: same ticks give same position', () => {
  const run = () => {
    let e = spawnEnemy('normal', 1, WP, 1);
    for (let i = 0; i < 30; i++) e = stepEnemy(e, 1 / 60, WP, 0).enemy;
    return e.x;
  };
  assert.equal(run(), run());
});

test('advances waypoint index when overshooting a corner', () => {
  const e = spawnEnemy('fast', 1, WP, 1); // speed 100
  const { enemy } = stepEnemy(e, 1.5, WP, 0); // 150px → past wp1(100) into wp2 segment
  assert.equal(enemy.wpIndex, 2);
  assert.ok(enemy.x > 100);
});

test('reachedExit after passing last waypoint', () => {
  let e = spawnEnemy('fast', 1, WP, 1); // 100 px/s, total path 200px
  let reached = false;
  for (let i = 0; i < 200 && !reached; i++) {
    const r = stepEnemy(e, 1 / 60, WP, 0);
    e = r.enemy; reached = r.reachedExit;
  }
  assert.equal(reached, true);
  assert.equal(e.alive, false);
});

test('effectiveSpeed and applySlow refresh/strongest', () => {
  let e = spawnEnemy('normal', 1, WP, 1); // base 55
  e = applySlow(e, 0.5, 1.5, 0);
  assert.equal(effectiveSpeed(e, 0), 27.5);   // slowed
  assert.equal(effectiveSpeed(e, 2), 55);     // expired at t=2 (>1.5)
  // re-apply weaker(0.8) while active(t=1) → keeps strongest 0.5, refreshes until 1+1.5=2.5
  let e2 = applySlow(e, 0.5, 1.5, 0);
  e2 = applySlow(e2, 0.8, 1.5, 1);
  assert.equal(e2.slowFactor, 0.5);
  assert.equal(e2.slowUntil, 2.5);
});

test('slow halves distance over same ticks', () => {
  const base = (() => { let e = spawnEnemy('normal', 1, WP, 1); for (let i = 0; i < 30; i++) e = stepEnemy(e, 1/60, WP, 0).enemy; return e.x; })();
  const slow = (() => { let e = applySlow(spawnEnemy('normal', 1, WP, 1), 0.5, 10, 0); for (let i = 0; i < 30; i++) e = stepEnemy(e, 1/60, WP, 0).enemy; return e.x; })();
  assert.ok(Math.abs(slow - base / 2) < 1e-6);
});
