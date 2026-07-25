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

test('boss appears as last enemy on boss waves', () => {
  const bossWave = CONFIG.waves.bossEvery; // 5
  const last = wavePlan(bossWave).count - 1;
  assert.equal(enemyKindAt(bossWave, last), 'boss');
  assert.equal(enemyKindAt(bossWave, 0), 'normal'); // 다른 인덱스는 보스 아님
  // 보스 웨이브가 아니면 보스 없음
  assert.notEqual(enemyKindAt(bossWave + 1, wavePlan(bossWave + 1).count - 1), 'boss');
});
