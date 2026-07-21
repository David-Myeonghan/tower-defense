import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, enemyHP, towerStat } from '../src/config.js';

test('enemyHP base and growth', () => {
  assert.equal(enemyHP('normal', 1), 12);
  assert.equal(enemyHP('normal', 2), Math.round(12 * 1.18));
  assert.ok(enemyHP('normal', 5) > enemyHP('normal', 4));
});

test('towerStat level 1 equals base, grows with level', () => {
  assert.equal(towerStat('arrow', 1, 'damage'), CONFIG.towers.arrow.damage);
  assert.equal(towerStat('arrow', 1, 'range'), CONFIG.towers.arrow.range);
  assert.ok(towerStat('arrow', 2, 'damage') > towerStat('arrow', 1, 'damage'));
  assert.ok(towerStat('arrow', 3, 'range') > towerStat('arrow', 1, 'range'));
});

test('towerStat returns level-invariant fields directly', () => {
  assert.equal(towerStat('cannon', 5, 'splash'), CONFIG.towers.cannon.splash);
  assert.equal(towerStat('frost', 3, 'slowFactor'), 0.5);
  assert.equal(towerStat('arrow', 9, 'fireRate'), CONFIG.towers.arrow.fireRate);
});
