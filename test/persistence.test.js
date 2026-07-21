import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSaveData, parseSave, createPersistence, SAVE_VERSION } from '../src/persistence.js';

const sample = { best: { wave: 12, score: 340 }, enemies: [{ x: 1 }], towers: [{ x: 2 }] };

test('toSaveData keeps best, stamps version/updatedAt, omits runtime board', () => {
  const sd = toSaveData(sample, 1000);
  assert.equal(sd.version, SAVE_VERSION);
  assert.equal(sd.updatedAt, 1000);
  assert.deepEqual(sd.best, { wave: 12, score: 340 });
  assert.equal(sd.enemies, undefined);
  assert.equal(sd.towers, undefined);
});

test('parseSave null on garbage / version mismatch, round-trips valid', () => {
  assert.equal(parseSave('nope'), null);
  assert.equal(parseSave(JSON.stringify({ version: 99 })), null);
  assert.equal(parseSave(JSON.stringify(toSaveData(sample, 1))).best.wave, 12);
});

test('injected storage round-trips; memory fallback on throw; null when empty', async () => {
  const mem = {};
  const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  const p = createPersistence(storage);
  await p.save(toSaveData(sample, 1));
  assert.equal((await p.load()).best.score, 340);

  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  const p2 = createPersistence(bad);
  await p2.save(toSaveData(sample, 1));
  assert.equal((await p2.load()).best.wave, 12);

  const p3 = createPersistence({ getItem: () => null, setItem: () => {} });
  assert.equal(await p3.load(), null);
});
