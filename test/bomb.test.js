import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, applyBomb, tick } from '../src/game.js';
import { createRewardedAd } from '../src/ads.js';
import { CONFIG } from '../src/config.js';
import { killReward } from '../src/economy.js';

function enemy(id, kind, hp, maxHp) {
  return { id, kind, x: 100, y: 100, wpIndex: 1, hp, maxHp, baseSpeed: 50, slowFactor: 1, slowUntil: 0, alive: true, reachedExit: false };
}

test('applyBomb clears normal/fast enemies and rewards each', () => {
  let s = freshState();
  s = { ...s, wave: 3, gold: 0, kills: 0, enemies: [enemy(1, 'normal', 10, 10), enemy(2, 'fast', 8, 8)] };
  const r = applyBomb(s);
  assert.equal(r.ok, true);
  assert.equal(r.state.enemies.length, 0);
  assert.equal(r.state.kills, 2);
  assert.equal(r.state.gold, killReward('normal', 3) + killReward('fast', 3));
  assert.equal(r.state.score, 2);
});

test('applyBomb reduces boss to configured ratio but keeps it alive', () => {
  let s = freshState();
  s = { ...s, enemies: [enemy(1, 'boss', 200, 200), enemy(2, 'normal', 10, 10)] };
  const r = applyBomb(s);
  const boss = r.state.enemies.find((e) => e.kind === 'boss');
  assert.ok(boss, 'boss survives');
  assert.equal(boss.hp, Math.round(200 * (1 - CONFIG.bomb.bossDamageRatio))); // 100
  assert.equal(r.state.enemies.length, 1); // normal 제거됨
});

test('applyBomb pushes a bomb flash effect', () => {
  let s = freshState();
  s = { ...s, enemies: [enemy(1, 'normal', 5, 5)] };
  const r = applyBomb(s);
  assert.ok(r.state.effects.some((fx) => fx.kind === 'bomb'));
});

test('applyBomb with no enemies is a no-op (ok:false)', () => {
  const s = freshState();
  const r = applyBomb({ ...s, enemies: [] });
  assert.equal(r.ok, false);
});

test('tick is paused while status is "ad"', () => {
  let s = freshState();
  s = { ...s, status: 'ad', enemies: [enemy(1, 'normal', 10, 10)] };
  const after = tick(s, 1 / 60);
  assert.equal(after, s); // 상태 불변 (몹·타워 정지)
});

test('mock rewarded ad resolves true after countdown (injected clock)', async () => {
  // setTimeout을 즉시 실행하도록 주입 → 결정론
  const immediate = (fn) => fn();
  const ad = createRewardedAd({ setTimeout: immediate, seconds: 3 });
  const progress = [];
  const ok = await ad.showRewardedAd({ onProgress: (r) => progress.push(r) });
  assert.equal(ok, true);
  assert.equal(progress[progress.length - 1], 0); // 카운트다운 끝
});
