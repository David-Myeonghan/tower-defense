import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wavePlan, enemyKindAt } from '../src/wave.js';
import { CONFIG } from '../src/config.js';

test('wavePlan base and growth', () => {
  assert.equal(wavePlan(1).count, CONFIG.waves.baseCount);
  assert.ok(wavePlan(3).count > wavePlan(1).count);
  assert.ok(wavePlan(2).bonus > wavePlan(1).bonus);
});

test('interval decays toward min, never below', () => {
  assert.ok(wavePlan(2).interval < wavePlan(1).interval);
  assert.ok(wavePlan(100).interval >= CONFIG.waves.minInterval);
});

test('enemyKindAt deterministic, fast only from fastEveryFrom', () => {
  assert.equal(enemyKindAt(1, 2), 'normal'); // before fastEveryFrom(3)
  assert.equal(enemyKindAt(3, 2), 'fast');   // index%3===2
  assert.equal(enemyKindAt(3, 0), 'normal');
  assert.equal(enemyKindAt(3, 2), enemyKindAt(3, 2)); // deterministic
});
