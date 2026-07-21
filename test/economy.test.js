import { test } from 'node:test';
import assert from 'node:assert/strict';
import { killReward, waveBonus, canAfford, placeTower, upgradeTower } from '../src/economy.js';
import { expandPathCells } from '../src/grid.js';

function baseState(gold = 200) {
  return { gold, nextId: 1, towers: [], pathSet: expandPathCells() };
}

test('killReward grows with wave', () => {
  assert.ok(killReward('normal', 3) > killReward('normal', 1));
});

test('placeTower on empty cell deducts and appends', () => {
  const r = placeTower(baseState(), 'arrow', 5, 5); // arrow base 40
  assert.equal(r.ok, true);
  assert.equal(r.state.gold, 160);
  assert.equal(r.state.towers.length, 1);
  assert.equal(r.state.nextId, 2);
});

test('placeTower rejects on path / occupied / broke', () => {
  assert.equal(placeTower(baseState(), 'arrow', 4, 0).ok, false); // on path
  const s = placeTower(baseState(), 'arrow', 5, 5).state;
  assert.equal(placeTower(s, 'arrow', 5, 5).ok, false);           // occupied
  assert.equal(placeTower(baseState(10), 'arrow', 5, 5).ok, false); // broke
});

test('upgradeTower bumps level and deducts, rejects when broke/unknown', () => {
  const placed = placeTower(baseState(200), 'arrow', 5, 5).state;
  const id = placed.towers[0].id;
  const up = upgradeTower(placed, id);
  assert.equal(up.ok, true);
  assert.equal(up.state.towers[0].level, 2);
  assert.ok(up.state.gold < placed.gold);
  assert.equal(upgradeTower(placed, 999).ok, false); // unknown
  assert.equal(upgradeTower({ ...placed, gold: 0 }, id).ok, false); // broke
});

test('waveBonus matches wavePlan and canAfford', () => {
  assert.ok(waveBonus(1) > 0);
  assert.equal(canAfford(50, 40), true);
  assert.equal(canAfford(30, 40), false);
});
