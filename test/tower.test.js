import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTower, towerStats, towerBaseCost, towerUpgradeCost } from '../src/tower.js';
import { cellToPixel } from '../src/grid.js';

test('createTower positions at cell center, level 1', () => {
  const t = createTower('arrow', 3, 5, 1);
  assert.deepEqual({ x: t.x, y: t.y }, cellToPixel(3, 5));
  assert.equal(t.level, 1);
  assert.equal(t.cooldownLeft, 0);
});

test('towerStats includes kind-specific fields', () => {
  assert.equal(towerStats('cannon', 1).splash, 45);
  assert.equal(towerStats('frost', 1).slowFactor, 0.5);
  assert.equal(towerStats('arrow', 1).splash, undefined);
  assert.equal(towerStats('arrow', 1).slowFactor, undefined);
});

test('upgrade cost grows with level', () => {
  assert.ok(towerUpgradeCost('arrow', 2) > towerUpgradeCost('arrow', 1));
  assert.equal(towerBaseCost('arrow'), 40);
});
