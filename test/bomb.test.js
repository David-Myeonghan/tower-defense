import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, applyBomb, tick } from '../src/game.js';
import { createRewardedAd } from '../src/ads.js';
import { CONFIG } from '../src/config.js';
import { killReward } from '../src/economy.js';

function enemy(id, kind, hp, maxHp) {
  return { id, kind, x: 100, y: 100, wpIndex: 1, hp, maxHp, baseSpeed: 50, slowFactor: 1, slowUntil: 0, alive: true, reachedExit: false };
}

// 폭탄 연출을 끝까지 구동해 최종 상태를 얻는 헬퍼
function runBomb(s0) {
  let s = applyBomb(s0).state;
  for (let i = 0; i < 200 && s.bomb; i++) s = tick(s, 1 / 60);
  return s;
}

test('applyBomb starts a drop sequence (not instant clear)', () => {
  let s = freshState();
  s = { ...s, enemies: [enemy(1, 'normal', 10, 10)] };
  const r = applyBomb(s);
  assert.equal(r.ok, true);
  assert.equal(r.state.bomb.phase, 'drop');
  assert.equal(r.state.enemies.length, 1); // 아직 안 죽음
});

test('bomb sequence clears normal/fast enemies and rewards each', () => {
  let s = freshState();
  s = { ...s, wave: 3, gold: 0, kills: 0, enemies: [enemy(1, 'normal', 10, 10), enemy(2, 'fast', 8, 8)] };
  s = runBomb(s);
  assert.equal(s.bomb, null); // 시퀀스 끝
  assert.equal(s.enemies.length, 0);
  assert.equal(s.kills, 2);
  assert.equal(s.gold, killReward('normal', 3) + killReward('fast', 3));
  assert.equal(s.score, 2);
});

test('bomb reduces boss to configured ratio but keeps it alive', () => {
  let s = freshState();
  s = { ...s, enemies: [enemy(1, 'boss', 200, 200), enemy(2, 'normal', 10, 10)] };
  s = runBomb(s);
  const boss = s.enemies.find((e) => e.kind === 'boss');
  assert.ok(boss, 'boss survives');
  assert.equal(boss.hp, Math.round(200 * (1 - CONFIG.bomb.bossDamageRatio))); // 100
  assert.equal(s.enemies.length, 1); // normal 제거됨
});

test('bomb sequence pushes flash and death effects', () => {
  let s = freshState();
  s = { ...s, enemies: [enemy(1, 'normal', 5, 5)] };
  s = applyBomb(s).state;
  let sawFlash = false, sawDeath = false;
  for (let i = 0; i < 200 && s.bomb; i++) {
    s = tick(s, 1 / 60);
    if (s.effects.some((fx) => fx.kind === 'bomb')) sawFlash = true;
    if (s.effects.some((fx) => fx.kind === 'death')) sawDeath = true;
  }
  assert.ok(sawFlash, 'flash shown');
  assert.ok(sawDeath, 'death particle shown');
});

test('board is frozen while bomb sequence runs (no spawn/move)', () => {
  let s = freshState();
  s = { ...s, spawn: { remaining: 5, timer: 0, index: 0 }, enemies: [enemy(9, 'boss', 200, 200)] };
  const before = s.enemies.length;
  s = applyBomb(s).state;
  s = tick(s, 1 / 60); // drop 단계 1틱: 스폰/이동 없어야 함
  assert.equal(s.spawn.remaining, 5); // 스폰 안 됨
  assert.equal(s.enemies.length, before); // 보스만, 새 스폰 없음
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
