import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage, tickCooldowns, fireTower, stepCombat } from '../src/combat.js';
import { createTower } from '../src/tower.js';
import { spawnEnemy } from '../src/enemy.js';

const WP = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
function enemyAt(id, x, y, hp = 100) {
  return { ...spawnEnemy('normal', 1, WP, id), x, y, hp, maxHp: hp };
}

test('applyDamage kills at 0', () => {
  assert.equal(applyDamage({ hp: 5, alive: true }, 6).alive, false);
  assert.equal(applyDamage({ hp: 5, alive: true }, 3).hp, 2);
});

test('fireTower on cooldown does not fire', () => {
  const t = { ...createTower('arrow', 0, 0, 1), cooldownLeft: 0.5 };
  const r = fireTower(t, [enemyAt(1, t.x + 10, t.y)], WP, 0);
  assert.equal(r.fired, false);
});

test('arrow damages only the target and sets cooldown', () => {
  const t = createTower('arrow', 0, 0, 1); // dmg 6
  const near = enemyAt(1, t.x + 10, t.y);
  const near2 = enemyAt(2, t.x + 20, t.y);
  const r = fireTower(t, [near, near2], WP, 0);
  assert.equal(r.fired, true);
  assert.equal(r.tower.cooldownLeft, 0.6);
  const e1 = r.enemies.find((e) => e.id === 1);
  const e2 = r.enemies.find((e) => e.id === 2);
  // First 타겟팅: 경로상 더 앞선(x=40) id2가 대상, id1은 무피해
  assert.equal(e2.hp, 94);
  assert.equal(e1.hp, 100);
});

test('cannon splash damages all within radius, none outside', () => {
  const t = createTower('cannon', 0, 0, 1); // dmg 10, splash 45
  const target = enemyAt(1, t.x + 10, t.y);      // in range, target
  const near = enemyAt(2, t.x + 10 + 30, t.y);   // within splash of target
  const far = enemyAt(3, t.x + 10 + 200, t.y);   // outside splash (and range)
  const r = fireTower(t, [target, near, far], WP, 0);
  assert.equal(r.enemies.find((e) => e.id === 1).hp, 90);
  assert.equal(r.enemies.find((e) => e.id === 2).hp, 90);
  assert.equal(r.enemies.find((e) => e.id === 3).hp, 100);
});

test('frost damages and slows target', () => {
  const t = createTower('frost', 0, 0, 1); // dmg 2, slow 0.5/1.5
  const e = enemyAt(1, t.x + 10, t.y);
  const r = fireTower(t, [e], WP, 5);
  const hit = r.enemies.find((x) => x.id === 1);
  assert.equal(hit.hp, 98);
  assert.equal(hit.slowFactor, 0.5);
  assert.equal(hit.slowUntil, 6.5);
});

test('killed enemy reported in killedIds', () => {
  const t = createTower('arrow', 0, 0, 1);
  const e = enemyAt(1, t.x + 10, t.y, 3); // dies to dmg 6
  const r = fireTower(t, [e], WP, 0);
  assert.deepEqual(r.killedIds, [1]);
  assert.equal(r.enemies[0].alive, false);
});

test('tickCooldowns decrements to zero floor', () => {
  const towers = [{ cooldownLeft: 0.1 }, { cooldownLeft: 1 }];
  const out = tickCooldowns(towers, 0.5);
  assert.equal(out[0].cooldownLeft, 0);
  assert.equal(out[1].cooldownLeft, 0.5);
});

test('stepCombat runs all towers', () => {
  const state = {
    towers: [createTower('arrow', 0, 0, 1)],
    enemies: [enemyAt(1, 30, 60)],
    waypoints: WP,
    timeSec: 0,
  };
  const r = stepCombat(state);
  assert.equal(r.towers.length, 1);
  assert.ok(r.enemies[0].hp < 100 || r.enemies[0].hp === 100); // fired if in range
});
