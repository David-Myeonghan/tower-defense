import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, enemyHP, towerStat } from '../src/config.js';

test('enemyHP base and growth', () => {
  assert.equal(enemyHP('normal', 1), CONFIG.enemies.normal.baseHP);
  assert.equal(enemyHP('normal', 2), Math.round(CONFIG.enemies.normal.baseHP * CONFIG.enemies.hpGrowth));
  assert.ok(enemyHP('normal', 5) > enemyHP('normal', 4));
  // 지수 성장이 리니어보다 가팔라야 함(웨이브 간격이 커질수록 증가폭도 커짐)
  const d1 = enemyHP('normal', 6) - enemyHP('normal', 5);
  const d2 = enemyHP('normal', 11) - enemyHP('normal', 10);
  assert.ok(d2 > d1, 'HP 증가폭이 후반에 더 커야 함(지수)');
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
