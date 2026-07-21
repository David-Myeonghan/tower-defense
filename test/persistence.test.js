import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSaveData, parseSave, createPersistence, SAVE_VERSION } from '../src/persistence.js';

const gameSnapshot = { status: 'playing', wave: 4, gold: 210, towers: [{ id: 1, kind: 'arrow', col: 5, row: 5, level: 2 }], best: { wave: 4, score: 30 } };

test('toSaveData wraps game snapshot, stamps version/updatedAt', () => {
  const sd = toSaveData(gameSnapshot, 1000);
  assert.equal(sd.version, SAVE_VERSION);
  assert.equal(sd.updatedAt, 1000);
  assert.deepEqual(sd.game, gameSnapshot);
});

test('parseSave null on garbage / version mismatch, round-trips valid', () => {
  assert.equal(parseSave('nope'), null);
  assert.equal(parseSave(JSON.stringify({ version: 999 })), null);
  assert.equal(parseSave(JSON.stringify(toSaveData(gameSnapshot, 1))).game.wave, 4);
});

test('injected storage round-trips; memory fallback on throw; null when empty', async () => {
  const mem = {};
  const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  const p = createPersistence(storage);
  await p.save(toSaveData(gameSnapshot, 1));
  const loaded = await p.load();
  assert.equal(loaded.game.gold, 210);
  assert.equal(loaded.game.towers[0].kind, 'arrow');

  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  const p2 = createPersistence(bad);
  await p2.save(toSaveData(gameSnapshot, 1));
  assert.equal((await p2.load()).game.wave, 4);

  const p3 = createPersistence({ getItem: () => null, setItem: () => {} });
  assert.equal(await p3.load(), null);
});
