import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressAlong, inRange, selectTarget } from '../src/targeting.js';
import { spawnEnemy, stepEnemy } from '../src/enemy.js';
import { createTower } from '../src/tower.js';

const WP = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }];

test('progressAlong strictly increases across ticks', () => {
  let e = spawnEnemy('normal', 1, WP, 1);
  let prev = progressAlong(e, WP);
  for (let i = 0; i < 10; i++) {
    e = stepEnemy(e, 1 / 60, WP, 0).enemy;
    const cur = progressAlong(e, WP);
    assert.ok(cur > prev, `expected ${cur} > ${prev}`);
    prev = cur;
  }
});

test('higher wpIndex outranks lower even if geometrically nearer', () => {
  // 타워를 wp1 근처에 두고: 적A는 세그먼트1 앞쪽(wpIndex1), 적B는 세그먼트2(wpIndex2)
  const tower = createTower('arrow', 0, 0, 99); // range 90
  tower.x = 100; tower.y = 0;
  const a = { ...spawnEnemy('normal', 1, WP, 1), x: 90, y: 0, wpIndex: 1 };
  const b = { ...spawnEnemy('normal', 1, WP, 2), x: 120, y: 0, wpIndex: 2 };
  const t = selectTarget(tower, [a, b], WP);
  assert.equal(t.id, 2); // b is further along
});

test('inRange boundary', () => {
  const tower = createTower('arrow', 0, 0, 1); // range 90 at (20,60)
  const on = { x: tower.x + 90, y: tower.y, alive: true };
  const off = { x: tower.x + 91, y: tower.y, alive: true };
  assert.equal(inRange(tower, on), true);
  assert.equal(inRange(tower, off), false);
});

test('selectTarget null when all out of range', () => {
  const tower = createTower('arrow', 0, 0, 1);
  const far = { ...spawnEnemy('normal', 1, WP, 1), x: 999, y: 999 };
  assert.equal(selectTarget(tower, [far], WP), null);
});

test('tie broken by lowest id', () => {
  const tower = createTower('arrow', 0, 0, 1);
  tower.x = 50; tower.y = 0;
  const a = { ...spawnEnemy('normal', 1, WP, 5), x: 50, y: 0, wpIndex: 1 };
  const b = { ...spawnEnemy('normal', 1, WP, 3), x: 50, y: 0, wpIndex: 1 };
  const t = selectTarget(tower, [a, b], WP);
  assert.equal(t.id, 3);
});
